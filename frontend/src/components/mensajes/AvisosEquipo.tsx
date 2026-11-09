"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlarmClock, Check, X } from "lucide-react";
import { apagarAlarma, marcarEstadoTarea, posponer, type Respuesta } from "@/app/mensajes/acciones";
import { SEGUNDOS_REFRESCO_CONTADOR } from "@/config/mensajes";
import { useAvisosEquipo, type Alarma } from "@/store/avisosEquipo";
import { EtiquetaPrioridad } from "./TarjetaTarea";

/** Un pitido corto de alarma (sin archivos de sonido: lo genera el navegador) */
function sonar() {
  try {
    const Contexto =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return;
    const ctx = new Contexto();
    [0, 0.25, 0.5].forEach((inicio) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.frequency.value = 880;
      vol.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
      vol.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + inicio + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + 0.18);
      osc.connect(vol).connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.2);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    // Si el navegador no deja sonar (sin haber tocado la página), se ve la tarjeta igual
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

/**
 * AVISOS DEL EQUIPO: va en el menú del panel. Pregunta al servidor cada poco cuántos mensajes hay
 * sin leer (el número del menú) y si hay que hacer sonar alguna alarma de tarea. Las alarmas salen
 * como tarjetas abajo a la derecha, con pitido y aviso del navegador.
 */
export function AvisosEquipo() {
  const ruta = usePathname();
  const router = useRouter();
  const { alarmas, poner, quitarAlarma } = useAvisosEquipo();
  const yaSonaron = useRef(new Set<string>());
  // Si el navegador ya dio o negó permiso para los avisos del sistema (en el servidor: no hay)
  const [permiso, setPermiso] = useState<NotificationPermission | "no-hay">(() =>
    typeof Notification === "undefined" ? "no-hay" : Notification.permission,
  );
  const [, empezar] = useTransition();


  useEffect(() => {
    let vivo = true;
    const mirar = async () => {
      try {
        const respuesta = await fetch("/api/mensajes/no-leidos", { cache: "no-store" });
        if (!respuesta.ok || !vivo) return;
        const datos = (await respuesta.json()) as { total: number; alarmas: Alarma[] };
        poner(datos);
        const nuevas = datos.alarmas.filter((a) => !yaSonaron.current.has(a.id));
        if (nuevas.length > 0) {
          sonar();
          nuevas.forEach((a) => {
            yaSonaron.current.add(a.id);
            avisoDelSistema(a, router.push);
          });
        }
      } catch {
        // Sin conexión: se vuelve a probar en la siguiente vuelta
      }
    };
    void mirar();
    const id = setInterval(mirar, SEGUNDOS_REFRESCO_CONTADOR * 1000);
    const alVolver = () => document.visibilityState === "visible" && void mirar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vivo = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [ruta, poner, router]);

  const hacer = (alarma: Alarma, accion: () => Promise<Respuesta>) => {
    quitarAlarma(alarma.id);
    empezar(async () => {
      await accion();
      router.refresh();
    });
  };

  if (alarmas.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Recordatorios de tareas"
      className="fixed right-4 bottom-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 print:hidden"
    >
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
          {permiso === "default" && (
            <button
              type="button"
              onClick={async () => setPermiso(await Notification.requestPermission())}
              className="mt-2 text-xs text-acento underline"
            >
              Avisarme también con notificaciones del navegador
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
