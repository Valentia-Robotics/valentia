"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, PhoneOff, Video } from "lucide-react";
import { SEGUNDOS_LATIDO, textoPresentes } from "@/config/llamadas";
import { DOMINIO_JAAS } from "@/config/llamadas";
import type { EntradaLlamada, EntradaPreparada, LlamadaEnCurso } from "@/lib/mensajes/llamadas";

/**
 * VIDEOLLAMADAS EN EL CHAT (Jesse, 13-11-2026). Tres piezas que usa Chat:
 *   - BotonLlamar: la cámara de la cabecera.
 *   - AvisoLlamadaEnCurso: la franja verde «Videollamada en curso · Unirme».
 *   - SalaVideo: la llamada a pantalla completa (dentro de la web, con JaaS) o, sin claves de
 *     JaaS, la tarjeta «Estás en la videollamada» mientras meet.jit.si está en otra pestaña.
 * El estado lo lleva useLlamada. Mientras estás dentro se manda un «latido» cada poco, así los
 * demás ven quién está y la llamada se termina sola cuando ya no queda nadie.
 */

async function pedir(cuerpo: object): Promise<Record<string, unknown>> {
  const respuesta = await fetch("/api/mensajes/llamada", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const datos = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;
  if (!respuesta.ok) throw new Error(String(datos.error ?? "No se ha podido hacer la llamada."));
  return datos;
}

/** Cuánto vale una entrada preparada (su pase dura 3 horas: se renueva mucho antes) */
const MINUTOS_PREPARADA = 20;

/**
 * El estado de la llamada de un chat. `modo` lo sabe ya la página (hay o no claves de JaaS): para
 * abrir meet.jit.si en otra pestaña hay que hacerlo en el mismo toque (si no, el navegador lo bloquea).
 *
 * MÁS RÁPIDA (Jesse, 13-11-2026): al abrir el chat se deja preparada la entrada (dirección + pase)
 * y se adelanta la conexión con 8x8. Al pulsar «Llamar», el vídeo empieza a cargar en ese mismo
 * instante; el aviso a los demás va a la vez, sin esperarlo.
 */
export function useLlamada(
  ruta: string,
  modo: EntradaLlamada["modo"],
  alCambiar: () => void,
  opciones: { activa: boolean; enCurso: LlamadaEnCurso | null },
) {
  const [sala, setSala] = useState<EntradaLlamada | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const salaActual = useRef<EntradaLlamada | null>(null);
  const pestana = useRef<Window | null>(null);
  const preparada = useRef<{ entrada: EntradaPreparada; en: number } | null>(null);
  const { activa, enCurso } = opciones;
  const salaEnCurso = enCurso?.sala ?? null;

  // Abrir antes la conexión con 8x8 (nombre, conexión segura): el vídeo arranca antes
  useEffect(() => {
    if (!activa || modo !== "incrustada") return;
    const enlaces = ["preconnect", "dns-prefetch"].map((rel) => {
      const enlace = document.createElement("link");
      enlace.rel = rel;
      enlace.href = `https://${DOMINIO_JAAS}`;
      if (rel === "preconnect") enlace.crossOrigin = "anonymous";
      document.head.appendChild(enlace);
      return enlace;
    });
    return () => enlaces.forEach((e) => e.remove());
  }, [activa, modo]);

  // Preparar la entrada al abrir el chat, cada MINUTOS_PREPARADA y cuando empieza o acaba una
  // llamada en el chat (así apunta a la sala buena)
  const preparar = useCallback(async () => {
    try {
      const datos = await pedir({ accion: "preparar", chat: ruta });
      const entrada = datos.entrada as EntradaPreparada | null;
      preparada.current = entrada ? { entrada, en: Date.now() } : null;
    } catch {
      preparada.current = null; // al pulsar «Llamar» se hace como siempre
    }
  }, [ruta]);
  useEffect(() => {
    if (!activa) return;
    void preparar();
    const id = setInterval(() => void preparar(), MINUTOS_PREPARADA * 60_000);
    return () => clearInterval(id);
  }, [activa, preparar, salaEnCurso]);

  const entrar = useCallback(async () => {
    if (salaActual.current || entrando) return;
    setError(null);
    setEntrando(true);
    // ¿Sirve la entrada preparada? Si hay una llamada en curso, solo si es de esa sala
    const lista = preparada.current;
    const usable =
      lista &&
      Date.now() - lista.en < MINUTOS_PREPARADA * 60_000 &&
      lista.entrada.modo === modo &&
      (!salaEnCurso || lista.entrada.sala === salaEnCurso)
        ? lista.entrada
        : null;
    preparada.current = null; // una sala nueva no se usa dos veces
    // En el mismo toque: la pestaña (ya en la sala si estaba preparada; si no, vacía y luego se lleva)
    if (modo === "pestana") {
      pestana.current = null;
      if (usable) window.open(usable.direccion, "_blank", "noopener");
      else pestana.current = window.open("", "_blank");
    }
    // Dentro de la web: el vídeo empieza a cargar YA, mientras el servidor apunta la llamada
    if (usable && modo === "incrustada") {
      const provisional = { ...usable, id: "" };
      salaActual.current = provisional;
      setSala(provisional);
    }
    try {
      const datos = (await pedir({
        accion: "entrar",
        chat: ruta,
        sala: usable?.sala,
      })) as unknown as EntradaLlamada;
      if (datos.modo === "pestana" && datos.sala !== usable?.sala) {
        if (pestana.current && !pestana.current.closed) {
          pestana.current.opener = null;
          pestana.current.location.href = datos.direccion;
        } else {
          pestana.current = window.open(datos.direccion, "_blank", "noopener");
        }
      }
      // Si colgó mientras tanto, se sale ya de la llamada que se acaba de apuntar
      if (usable && modo === "incrustada" && salaActual.current?.sala !== usable.sala) {
        colgarAlSalir(datos);
        return;
      }
      // Misma sala: el vídeo sigue cargando sin parpadear (solo se apunta el id de la llamada)
      const final =
        usable && datos.sala === usable.sala ? { ...datos, direccion: usable.direccion } : datos;
      salaActual.current = final;
      setSala(final);
      alCambiar();
    } catch (e) {
      pestana.current?.close();
      salaActual.current = null;
      setSala(null);
      setError(e instanceof Error ? e.message : "No se ha podido hacer la llamada.");
    } finally {
      setEntrando(false);
    }
  }, [ruta, modo, entrando, alCambiar, salaEnCurso]);

  const colgar = useCallback(() => {
    const actual = salaActual.current;
    salaActual.current = null;
    setSala(null);
    // Para la siguiente llamada, otra entrada preparada
    if (activa) setTimeout(() => void preparar(), 1500);
    if (!actual?.id) return; // aún no estaba apuntada: entrar() la cierra al volver
    void pedir({ accion: "salir", id: actual.id })
      .catch(() => undefined)
      .finally(alCambiar);
  }, [alCambiar, activa, preparar]);

  // «Sigo dentro» cada poco; si la llamada ya ha terminado (o no hay conexión), se cierra
  useEffect(() => {
    if (!sala?.id) return;
    const id = setInterval(() => {
      pedir({ accion: "latido", id: sala.id })
        .then((d) => {
          if (d.sigue === false) {
            salaActual.current = null;
            setSala(null);
            alCambiar();
          }
        })
        .catch(() => undefined);
    }, SEGUNDOS_LATIDO * 1000);
    // Al cerrar la pestaña o irse de la página: colgar (sendBeacon sale aunque la página se cierre)
    const alIrse = () =>
      navigator.sendBeacon?.(
        "/api/mensajes/llamada",
        new Blob([JSON.stringify({ accion: "salir", id: sala.id })], { type: "text/plain" }),
      );
    window.addEventListener("pagehide", alIrse);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", alIrse);
    };
  }, [sala, alCambiar]);

  // Si se cambia de chat con la llamada abierta, se cuelga
  useEffect(() => () => colgarAlSalir(salaActual.current), []);

  return { sala, entrando, error, entrar, colgar, quitarError: () => setError(null) };
}

function colgarAlSalir(sala: EntradaLlamada | null) {
  if (!sala?.id) return;
  void fetch("/api/mensajes/llamada", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "salir", id: sala.id }),
    keepalive: true,
  }).catch(() => undefined);
}

/** La cámara de la cabecera del chat */
export function BotonLlamar({
  alPulsar,
  ocupado,
  titulo,
}: {
  alPulsar: () => void;
  ocupado: boolean;
  titulo: string;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={ocupado}
      aria-label={`Videollamada con ${titulo}`}
      title="Videollamada"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gris hover:bg-niebla hover:text-tinta disabled:opacity-50"
    >
      <Video aria-hidden="true" className="size-5" />
      <span className="hidden sm:inline">{ocupado ? "Llamando…" : "Llamar"}</span>
    </button>
  );
}

/** Franja bajo la cabecera: «Videollamada en curso · Jesse y Dani · Unirme» */
export function AvisoLlamadaEnCurso({
  llamada,
  alUnirse,
  ocupado,
}: {
  llamada: LlamadaEnCurso;
  alUnirse: () => void;
  ocupado: boolean;
}) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-exito/30 bg-exito/10 px-3 py-2 text-sm sm:px-4"
    >
      <span className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-exito text-white">
        <Video aria-hidden="true" className="size-4" />
        <span className="absolute inset-0 animate-ping rounded-full bg-exito/40 motion-reduce:hidden" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">Videollamada en curso</span>
        <span className="block truncate text-xs text-gris">
          {llamada.dentro.length > 0
            ? `Dentro: ${textoPresentes(llamada.dentro)}`
            : `La ha empezado ${llamada.de}`}
        </span>
      </span>
      {!llamada.yoDentro && (
        <button
          type="button"
          onClick={alUnirse}
          disabled={ocupado}
          className="shrink-0 rounded-full bg-exito px-3 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {ocupado ? "Entrando…" : "Unirme"}
        </button>
      )}
    </div>
  );
}

/** La llamada abierta */
export function SalaVideo({
  sala,
  titulo,
  alColgar,
}: {
  sala: EntradaLlamada;
  titulo: string;
  alColgar: () => void;
}) {
  // Esc no cuelga (en una llamada se pulsa sin querer); solo el botón rojo
  if (sala.modo === "pestana") {
    return (
      <div
        role="dialog"
        aria-label="Estás en una videollamada"
        className="fixed right-4 bottom-4 z-[60] w-[min(22rem,calc(100vw-2rem))] animate-tarjeta rounded-xl border-2 border-exito bg-white p-4 shadow-xl"
      >
        <p className="flex items-center gap-2 font-semibold">
          <Video aria-hidden="true" className="size-5 text-exito" />
          Estás en la videollamada
        </p>
        <p className="mt-1 text-sm text-gris">
          Se ha abierto en otra pestaña. Si te pide iniciar sesión, entra con Google: solo hace
          falta para la primera persona.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a
            href={sala.direccion}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-linea px-3 py-1.5 hover:border-tinta"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            Volver a abrirla
          </a>
          <button
            type="button"
            onClick={alColgar}
            className="inline-flex items-center gap-1 rounded-full bg-error px-3 py-1.5 font-medium text-white hover:opacity-90"
          >
            <PhoneOff aria-hidden="true" className="size-4" />
            He colgado
          </button>
        </div>
      </div>
    );
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Videollamada con ${titulo}`}
      className="fixed inset-0 z-[60] flex flex-col bg-tinta"
    >
      <div className="flex items-center gap-3 px-3 py-2 text-white sm:px-4">
        <Video aria-hidden="true" className="size-5 shrink-0" />
        <p className="min-w-0 flex-1 truncate font-medium">Videollamada · {titulo}</p>
        <button
          type="button"
          onClick={alColgar}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-error px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <PhoneOff aria-hidden="true" className="size-4" />
          Colgar
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <MarcoLlamada key={sala.direccion} direccion={sala.direccion} titulo={titulo} />
      </div>
    </div>
  );
}

/** El vídeo de JaaS. Mientras carga, «Conectando…» (para que se vea que ya está en marcha) */
function MarcoLlamada({ direccion, titulo }: { direccion: string; titulo: string }) {
  const [cargado, setCargado] = useState(false);
  return (
    <>
      {!cargado && (
        <p
          role="status"
          className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white/80"
        >
          <Video aria-hidden="true" className="size-5 animate-pulse" />
          Conectando con la videollamada…
        </p>
      )}
      <iframe
        src={direccion}
        title={`Videollamada con ${titulo}`}
        allow="camera; microphone; display-capture; fullscreen; autoplay; clipboard-write"
        onLoad={() => setCargado(true)}
        className="absolute inset-0 size-full border-0"
      />
    </>
  );
}
