"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlarmClock, BellRing, Check, MessageCircle, Video, X } from "lucide-react";
import { apagarAlarma, marcarEstadoTarea, posponer, type Respuesta } from "@/app/mensajes/acciones";
import { SEGUNDOS_REFRESCO_CONTADOR, grupoDe } from "@/config/mensajes";
import { activarAvisos, estadoAvisos, repasarAvisos, type EstadoAvisos } from "@/lib/push/cliente";
import { useAvisosEquipo, type Alarma, type UltimoMensaje } from "@/store/avisosEquipo";
import type { LlamadaEntrante } from "@/lib/mensajes/llamadas";
import { EtiquetaPrioridad } from "./TarjetaTarea";

/** Un solo «altavoz» para toda la página: el navegador solo deja sonar después de tocar la página */
let altavoz: AudioContext | null = null;
function prepararAltavoz() {
  try {
    const Contexto =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return null;
    altavoz ??= new Contexto();
    if (altavoz.state === "suspended") void altavoz.resume();
    return altavoz;
  } catch {
    return null;
  }
}

/**
 * Sonidos sin archivos (los genera el navegador): «mensaje» = dos notas cortas, como un
 * «tilín»; «alarma» = tres pitidos. Si el navegador no deja sonar, se ve la tarjeta igual.
 */
function sonar(tipo: "mensaje" | "alarma" | "llamada" = "alarma") {
  const ctx = prepararAltavoz();
  if (!ctx) return;
  try {
    const notas =
      tipo === "mensaje"
        ? [
            { inicio: 0, frecuencia: 988 },
            { inicio: 0.14, frecuencia: 1319 },
          ]
        : tipo === "llamada"
          ? // «Ring-ring» de teléfono: dos tonos dobles
            [0, 0.12, 0.6, 0.72].map((inicio, i) => ({ inicio, frecuencia: i % 2 ? 523 : 659 }))
          : [0, 0.25, 0.5].map((inicio) => ({ inicio, frecuencia: 880 }));
    for (const { inicio, frecuencia } of notas) {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = tipo === "alarma" ? "square" : "sine";
      osc.frequency.value = frecuencia;
      const t = ctx.currentTime + inicio;
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(tipo === "alarma" ? 0.2 : 0.3, t + 0.02);
      vol.gain.exponentialRampToValueAtTime(
        0.0001,
        t + (tipo === "mensaje" ? 0.35 : tipo === "llamada" ? 0.11 : 0.18),
      );
      osc.connect(vol).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    }
  } catch {
    // Sin sonido: queda la tarjeta
  }
}

/** Aviso del sistema (como el de WhatsApp en el ordenador), si la persona lo ha permitido */
function avisoDelSistema(alarma: Alarma, ir: (ruta: string) => void) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const aviso = new Notification("⏰ Recordatorio de tarea", {
      body: alarma.texto.slice(0, 140),
      tag: `tarea-${alarma.id}`,
    });
    aviso.onclick = () => {
      window.focus();
      ir(`/mensajes/${alarma.ruta}`);
    };
  } catch {
    // En algunos móviles solo se puede desde un service worker: queda la tarjeta y el correo
  }
}

/** Sin la parte «(3) » que pone esta misma página delante del título */
const sinNumero = (titulo: string) => titulo.replace(/^\(\d+\+?\) /, "");

/** «No me lo vuelvas a enseñar en 3 días» del cartel de activar avisos */
const CLAVE_CARTEL = "valentia-cartel-avisos";
const DIAS_CARTEL = 3;

function cartelEscondido() {
  try {
    return Date.now() < Number(localStorage.getItem(CLAVE_CARTEL) ?? 0);
  } catch {
    return false;
  }
}

/**
 * AVISOS DEL EQUIPO: va en el menú del panel (todas las zonas del equipo). Hace que nadie se
 * pierda un mensaje, como en WhatsApp:
 *   - Pregunta al servidor cada pocos segundos cuántos mensajes hay sin leer (el número del menú,
 *     del título de la pestaña y del icono de la app) y al momento cuando llega un aviso push.
 *   - Con un mensaje nuevo: «tilín», tarjeta «Nuevo mensaje de…» y, si la pestaña está escondida,
 *     el título parpadea.
 *   - Alarmas de tareas: tarjetas abajo a la derecha, con pitido y aviso del navegador.
 *   - Videollamadas: «📹 Jesse te llama» con su «ring-ring» mientras suena (Unirme / Ahora no).
 *   - Cartel para activar los avisos push en este aparato (con el paso extra del iPhone).
 */
export function AvisosEquipo({ email }: { email: string }) {
  const ruta = usePathname();
  const router = useRouter();
  const { alarmas, total, poner, quitarAlarma } = useAvisosEquipo();
  const yaSonaron = useRef(new Set<string>());
  const ultimoVisto = useRef<string | null | undefined>(undefined);
  const rutaActual = useRef(ruta);
  const [nuevo, setNuevo] = useState<UltimoMensaje | null>(null);
  const [parpadeo, setParpadeo] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<EstadoAvisos | null>(null);
  const [cartel, setCartel] = useState(false);
  const [activando, setActivando] = useState(false);
  const [llamadas, setLlamadas] = useState<LlamadaEntrante[]>([]);
  const [colgadas, setColgadas] = useState<string[]>([]);
  const [, empezar] = useTransition();

  useEffect(() => {
    rutaActual.current = ruta;
  }, [ruta]);

  // El navegador solo deja sonar después de que toques la página: se prepara al primer toque
  useEffect(() => {
    const preparar = () => prepararAltavoz();
    window.addEventListener("pointerdown", preparar, { once: true });
    window.addEventListener("keydown", preparar, { once: true });
    return () => {
      window.removeEventListener("pointerdown", preparar);
      window.removeEventListener("keydown", preparar);
    };
  }, []);

  // ¿Están activados los avisos push en este aparato? (y si sí, se repasa que el servidor lo sepa)
  useEffect(() => {
    let vivo = true;
    void estadoAvisos().then((estado) => {
      if (!vivo) return;
      setAvisos(estado);
      setCartel((estado === "apagado" || estado === "instalar-ios") && !cartelEscondido());
      if (estado === "activado") void repasarAvisos(email);
    });
    return () => {
      vivo = false;
    };
  }, [email]);

  useEffect(() => {
    let vivo = true;
    const mirar = async () => {
      try {
        const respuesta = await fetch("/api/mensajes/no-leidos", { cache: "no-store" });
        if (!respuesta.ok || !vivo) return;
        const datos = (await respuesta.json()) as {
          total: number;
          alarmas: Alarma[];
          ultimo: UltimoMensaje | null;
          llamadas?: LlamadaEntrante[];
        };
        poner(datos);
        setLlamadas(datos.llamadas ?? []);

        // ¿Mensaje nuevo desde la última vez? (la primera vuelta solo aprende cuál era el último)
        const antes = ultimoVisto.current;
        ultimoVisto.current = datos.ultimo?.id ?? null;
        const visible = document.visibilityState === "visible";
        let aviso = false;
        if (antes !== undefined && datos.ultimo && datos.ultimo.id !== antes) {
          const enEseChat = rutaActual.current === `/mensajes/${datos.ultimo.ruta}`;
          if (!(enEseChat && visible)) {
            aviso = true;
            sonar("mensaje");
            if (!visible) setParpadeo(`💬 ${datos.ultimo.de}`);
          }
        }
        // La tarjeta se queda mientras ese siga siendo el último sin leer (al leerlo, se va)
        setNuevo((n) => (aviso ? datos.ultimo : n && datos.ultimo?.id === n.id ? n : null));

        const nuevas = datos.alarmas.filter((a) => !yaSonaron.current.has(a.id));
        if (nuevas.length > 0) {
          sonar("alarma");
          nuevas.forEach((a) => {
            yaSonaron.current.add(a.id);
            // Con los avisos push activados, el aviso del sistema ya lo pone el móvil
            if (avisos !== "activado") avisoDelSistema(a, router.push);
          });
          if (!visible) setParpadeo("⏰ Recordatorio");
        }
      } catch {
        // Sin conexión: se vuelve a probar en la siguiente vuelta
      }
    };
    void mirar();
    const id = setInterval(mirar, SEGUNDOS_REFRESCO_CONTADOR * 1000);
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      setParpadeo(null);
      void mirar();
    };
    // Cuando llega un aviso push, el service worker avisa a las pestañas abiertas: se mira ya
    const alAvisoPush = (evento: MessageEvent) => {
      if ((evento.data as { tipo?: string } | null)?.tipo === "aviso-push") void mirar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    navigator.serviceWorker?.addEventListener("message", alAvisoPush);
    return () => {
      vivo = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
      navigator.serviceWorker?.removeEventListener("message", alAvisoPush);
    };
  }, [ruta, poner, router, avisos]);

  // El título de la pestaña: «(3) Mensajes · Valentia» y, si hay algo nuevo con la pestaña
  // escondida, parpadea con quién te ha escrito (como WhatsApp Web)
  useEffect(() => {
    let base = sinNumero(document.title);
    let puesto = document.title;
    let fase = false;
    const poner = () => {
      // Si la web ha cambiado el título (otra página), ese es el nuevo de base
      if (document.title !== puesto) base = sinNumero(document.title);
      fase = !fase;
      const conNumero = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
      puesto = parpadeo && fase ? parpadeo : conNumero;
      document.title = puesto;
    };
    poner();
    const id = setInterval(poner, 1000);
    return () => {
      clearInterval(id);
      if (document.title === puesto) document.title = base;
    };
  }, [total, parpadeo, ruta]);

  // El número en el icono de la app instalada (Android, iPhone, ordenador)
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    try {
      if (total > 0) void nav.setAppBadge?.(total).catch(() => undefined);
      else void nav.clearAppBadge?.().catch(() => undefined);
    } catch {
      // No todos los navegadores lo tienen
    }
  }, [total]);

  const hacer = (alarma: Alarma, accion: () => Promise<Respuesta>) => {
    quitarAlarma(alarma.id);
    empezar(async () => {
      await accion();
      router.refresh();
    });
  };

  const activar = async () => {
    setActivando(true);
    try {
      const estado = await activarAvisos(email);
      setAvisos(estado);
      if (estado === "activado") setCartel(false);
    } catch {
      setAvisos("apagado");
    } finally {
      setActivando(false);
    }
  };

  const esconderCartel = () => {
    setCartel(false);
    try {
      localStorage.setItem(CLAVE_CARTEL, String(Date.now() + DIAS_CARTEL * 86_400_000));
    } catch {}
  };

  // Las llamadas que suenan: no las que he dicho «Ahora no» ni la del chat que tengo abierto
  // (allí ya sale la franja «Videollamada en curso · Unirme»)
  const sonando = llamadas.filter(
    (l) => !colgadas.includes(l.id) && ruta !== `/mensajes/${l.ruta}`,
  );
  const hayLlamada = sonando.length > 0;
  // «Ring-ring» cada 3 segundos mientras haya una llamada sonando
  useEffect(() => {
    if (!hayLlamada) return;
    sonar("llamada");
    const id = setInterval(() => sonar("llamada"), 3000);
    return () => clearInterval(id);
  }, [hayLlamada]);

  const verTarjetaNuevo = nuevo && ruta !== `/mensajes/${nuevo.ruta}`;
  if (alarmas.length === 0 && !verTarjetaNuevo && !cartel && !hayLlamada) return null;

  return (
    <div
      role="region"
      aria-label="Avisos del equipo"
      className="fixed right-4 bottom-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 print:hidden"
    >
      {sonando.slice(0, 2).map((l) => (
        <div
          key={l.id}
          role="alert"
          className="animate-tarjeta rounded-xl border-2 border-exito bg-white p-4 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-exito text-white">
              <Video aria-hidden="true" className="size-5" />
              <span className="absolute inset-0 animate-ping rounded-full bg-exito/40 motion-reduce:hidden" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-gris uppercase">
                Videollamada{grupoDe(l.ruta) ? ` en ${grupoDe(l.ruta)!.nombre}` : ""}
              </p>
              <p className="mt-0.5 font-medium">
                {grupoDe(l.ruta) ? `${l.de} ha empezado una llamada` : `${l.de} te llama`}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link
              href={`/mensajes/${l.ruta}?llamada=1`}
              onClick={() => setColgadas((c) => [...c, l.id])}
              className="inline-flex items-center gap-1.5 rounded-full bg-exito px-3 py-1.5 font-medium text-white hover:opacity-90"
            >
              <Video aria-hidden="true" className="size-4" />
              Unirme
            </Link>
            <button
              type="button"
              onClick={() => setColgadas((c) => [...c, l.id])}
              className="rounded-full border border-linea px-3 py-1.5 hover:border-tinta"
            >
              Ahora no
            </button>
          </div>
        </div>
      ))}

      {cartel && (
        <div className="animate-tarjeta rounded-xl border-2 border-acento bg-white p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-acento text-white">
              <BellRing aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">Entérate al momento de los mensajes</p>
              {avisos === "instalar-ios" ? (
                <p className="mt-1 text-gris">
                  En el iPhone, primero añade la web a tu pantalla de inicio: botón{" "}
                  <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong>. Ábrela
                  desde ese icono y activa los avisos.
                </p>
              ) : (
                <p className="mt-1 text-gris">
                  Te saldrá un aviso en el móvil o el ordenador, como en WhatsApp, aunque tengas la
                  web cerrada.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={esconderCartel}
              aria-label="Ahora no"
              className="-mt-1 -mr-1 inline-flex size-7 items-center justify-center rounded text-gris hover:bg-niebla hover:text-tinta"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {avisos === "apagado" && (
              <button
                type="button"
                onClick={activar}
                disabled={activando}
                className="rounded-full bg-acento px-3 py-1.5 font-medium text-white hover:bg-acento-hover disabled:opacity-60"
              >
                {activando ? "Activando…" : "Activar avisos"}
              </button>
            )}
            <Link href="/mensajes/avisos" className="text-acento underline">
              Ver cómo se hace
            </Link>
          </div>
        </div>
      )}

      {verTarjetaNuevo && (
        <div
          role="status"
          className="animate-tarjeta rounded-xl border border-linea bg-white p-4 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-acento/10 text-acento">
              <MessageCircle aria-hidden="true" className="size-5" />
            </span>
            <Link
              href={`/mensajes/${nuevo.ruta}`}
              onClick={() => setNuevo(null)}
              className="min-w-0 flex-1"
            >
              <p className="text-xs font-semibold tracking-wide text-gris uppercase">
                Nuevo mensaje{grupoDe(nuevo.ruta) ? ` en ${grupoDe(nuevo.ruta)!.nombre}` : ""}
              </p>
              <p className="mt-0.5 font-medium">{nuevo.de}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-gris">{nuevo.texto}</p>
            </Link>
            <button
              type="button"
              onClick={() => setNuevo(null)}
              aria-label="Cerrar el aviso"
              className="-mt-1 -mr-1 inline-flex size-7 items-center justify-center rounded text-gris hover:bg-niebla hover:text-tinta"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      )}

      {alarmas.slice(0, 3).map((a) => (
        <div
          key={a.id}
          role="alert"
          className="animate-tarjeta rounded-xl border border-linea bg-white p-4 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-aviso/10 text-aviso-oscuro">
              <AlarmClock aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-gris uppercase">
                Recordatorio · de {a.de}
              </p>
              <p className="mt-1 line-clamp-3 text-sm whitespace-pre-wrap">{a.texto}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gris">
                <EtiquetaPrioridad prioridad={a.prioridad} />
                {a.entrega && <span>Entrega: {a.entrega}</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => hacer(a, () => apagarAlarma(a.id))}
              aria-label="Cerrar la alarma"
              className="-mt-1 -mr-1 inline-flex size-7 items-center justify-center rounded text-gris hover:bg-niebla hover:text-tinta"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => hacer(a, () => marcarEstadoTarea(a.id, "HECHA"))}
              className="inline-flex items-center gap-1 rounded-full bg-exito px-2.5 py-1 font-medium text-white hover:opacity-90"
            >
              <Check aria-hidden="true" className="size-3.5" />
              Hecha
            </button>
            <button
              type="button"
              onClick={() => hacer(a, () => posponer(a.id, 10))}
              className="rounded-full border border-linea px-2.5 py-1 hover:border-tinta"
            >
              En 10 min
            </button>
            <button
              type="button"
              onClick={() => hacer(a, () => posponer(a.id, 60))}
              className="rounded-full border border-linea px-2.5 py-1 hover:border-tinta"
            >
              En 1 hora
            </button>
            <Link
              href={`/mensajes/${a.ruta}`}
              className="rounded-full border border-linea px-2.5 py-1 hover:border-tinta"
            >
              Ver el chat
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
