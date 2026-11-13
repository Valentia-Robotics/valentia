"use client";

/**
 * NOTAS DE VOZ DEL CHAT, como en WhatsApp:
 *   - `Grabadora`: botón del micrófono. Al pulsarlo pide permiso, graba y enseña el tiempo; «Enviar»
 *     la manda y la papelera la tira. A los 5 minutos se para y se envía sola.
 *   - `ReproductorAudio`: el botón de play, la barra (se puede tocar para saltar) y el tiempo.
 * Graba en el formato que mejor se oye en todos los aparatos (`formatoGrabacion`: MP4 si se puede,
 * que es el que graba Safari en el iPhone).
 */
import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, SendHorizontal, Trash2 } from "lucide-react";
import {
  MAX_SEGUNDOS_AUDIO,
  MIN_SEGUNDOS_AUDIO,
  duracionAudio,
  extensionAudio,
  formatoGrabacion,
  tipoAudioBase,
} from "@/config/mensajes";
import { cn } from "@/lib/utils";

/** Qué decir cuando no se puede grabar */
function textoDeError(error: unknown): string {
  const nombre = error instanceof DOMException ? error.name : "";
  if (nombre === "NotAllowedError" || nombre === "SecurityError")
    return "No hay permiso para usar el micrófono. Dale permiso en el candado de la barra de direcciones (o en los ajustes del móvil) y vuelve a probar.";
  if (nombre === "NotFoundError") return "No encontramos ningún micrófono en este aparato.";
  if (nombre === "NotReadableError")
    return "El micrófono lo está usando otra aplicación. Ciérrala y vuelve a probar.";
  return "No se ha podido empezar a grabar. Vuelve a probar.";
}

interface PropsGrabadora {
  /** La nota de voz terminada (el archivo y cuánto dura) */
  alTerminar: (archivo: File, segundos: number) => void;
  /** Avisa si se está grabando (el chat esconde el cuadro de texto mientras tanto) */
  alCambiar: (grabando: boolean) => void;
  alFallar: (mensaje: string) => void;
}

export function Grabadora({ alTerminar, alCambiar, alFallar }: PropsGrabadora) {
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const grabadora = useRef<MediaRecorder | null>(null);
  const microfono = useRef<MediaStream | null>(null);
  const trozos = useRef<Blob[]>([]);
  const inicio = useRef(0);
  const enviarAlParar = useRef(false);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Apaga el micrófono (el punto rojo del navegador desaparece) y el reloj */
  const soltar = () => {
    microfono.current?.getTracks().forEach((pista) => pista.stop());
    microfono.current = null;
    if (reloj.current) clearInterval(reloj.current);
    reloj.current = null;
    grabadora.current = null;
    setGrabando(false);
    alCambiar(false);
  };

  // Si se sale del chat a mitad de grabación, se apaga el micrófono sin enviar nada
  useEffect(
    () => () => {
      enviarAlParar.current = false;
      if (grabadora.current?.state === "recording") grabadora.current.stop();
      microfono.current?.getTracks().forEach((pista) => pista.stop());
      if (reloj.current) clearInterval(reloj.current);
    },
    [],
  );

  const parar = (enviar: boolean) => {
    enviarAlParar.current = enviar;
    const g = grabadora.current;
    if (g && g.state !== "inactive") g.stop();
    else soltar();
  };

  const empezar = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      alFallar(
        "Este navegador no puede grabar audio. Prueba con Chrome, Safari o Firefox actualizados.",
      );
      return;
    }
    let flujo: MediaStream;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (error) {
      alFallar(textoDeError(error));
      return;
    }
    const formato = formatoGrabacion((tipo) => MediaRecorder.isTypeSupported(tipo));
    let g: MediaRecorder;
    try {
      // 32 kbit/s: la voz se oye bien y 5 minutos pesan poco más de 1 MB
      g = new MediaRecorder(flujo, {
        ...(formato && { mimeType: formato }),
        audioBitsPerSecond: 32_000,
      });
    } catch (error) {
      flujo.getTracks().forEach((pista) => pista.stop());
      alFallar(textoDeError(error));
      return;
    }
    microfono.current = flujo;
    grabadora.current = g;
    trozos.current = [];
    g.ondataavailable = (evento) => {
      if (evento.data.size > 0) trozos.current.push(evento.data);
    };
    g.onstop = () => {
      const duracion = (Date.now() - inicio.current) / 1000;
      const tipo = g.mimeType || trozos.current[0]?.type || formato || "audio/webm";
      const enviar = enviarAlParar.current;
      soltar();
      if (!enviar) return;
      if (duracion < MIN_SEGUNDOS_AUDIO) {
        alFallar("Mantén la grabación un poco más: la nota de voz era demasiado corta.");
        return;
      }
      const base = tipoAudioBase(tipo) ?? "audio/webm";
      const archivo = new File(trozos.current, `nota-de-voz.${extensionAudio(base)}`, {
        type: base,
      });
      alTerminar(archivo, Math.min(MAX_SEGUNDOS_AUDIO, Math.round(duracion)));
    };
    // Trozos de 1 s: si algo se corta, lo grabado hasta ahí no se pierde
    g.start(1000);
    inicio.current = Date.now();
    setSegundos(0);
    setGrabando(true);
    alCambiar(true);
    reloj.current = setInterval(() => {
      const pasados = (Date.now() - inicio.current) / 1000;
      setSegundos(pasados);
      if (pasados >= MAX_SEGUNDOS_AUDIO) parar(true); // como mucho 5 minutos: se envía sola
    }, 250);
  };

  if (!grabando) {
    return (
      <button
        type="button"
        onClick={() => void empezar()}
        aria-label="Grabar una nota de voz"
        title="Grabar una nota de voz"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-acento text-white transition-colors hover:bg-acento-hover"
      >
        <Mic aria-hidden="true" className="size-5" />
      </button>
    );
  }

  return (
    <div className="flex min-h-11 flex-1 items-center gap-2" role="status">
      <button
        type="button"
        onClick={() => parar(false)}
        aria-label="Tirar la grabación"
        title="Tirar la grabación"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-gris transition-colors hover:bg-niebla hover:text-error"
      >
        <Trash2 aria-hidden="true" className="size-5" />
      </button>
      <div className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-linea bg-niebla px-4">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 animate-pulse rounded-full bg-error"
        />
        <span className="font-mono text-sm tabular-nums">{duracionAudio(segundos)}</span>
        <span className="truncate text-sm text-gris">
          Grabando…{" "}
          <span className="hidden sm:inline">(máx. {duracionAudio(MAX_SEGUNDOS_AUDIO)})</span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => parar(true)}
        aria-label="Enviar la nota de voz"
        title="Enviar la nota de voz"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-acento text-white transition-colors hover:bg-acento-hover"
      >
        <SendHorizontal aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}

/**
 * El reproductor de una nota de voz. La duración es la que se guardó al grabar (los WebM de Chrome
 * no la traen dentro y el navegador diría «Infinity»). No descarga nada hasta que se pulsa play.
 */
export function ReproductorAudio({
  src,
  segundos,
  mio,
}: {
  src: string;
  segundos: number;
  mio: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [sonando, setSonando] = useState(false);
  const [actual, setActual] = useState(0);
  const [error, setError] = useState(false);
  const total = Math.max(segundos, 1);

  const alternar = async () => {
    const el = audio.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    // Solo suena una a la vez, como en WhatsApp
    document.querySelectorAll<HTMLAudioElement>("audio[data-nota-voz]").forEach((otro) => {
      if (otro !== el) otro.pause();
    });
    try {
      setError(false);
      await el.play();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(true);
    }
  };

  const saltar = (valor: number) => {
    const el = audio.current;
    if (!el) return;
    try {
      el.currentTime = valor;
    } catch {
      // Aún sin cargar: se queda donde estaba
    }
    setActual(valor);
  };

  return (
    <div className="-mx-1 mb-0.5 flex w-60 max-w-full items-center gap-2.5 sm:w-72">
      <audio
        ref={audio}
        data-nota-voz
        src={src}
        preload="none"
        onPlay={() => setSonando(true)}
        onPause={() => setSonando(false)}
        onEnded={() => {
          setSonando(false);
          setActual(0);
        }}
        onTimeUpdate={(e) => setActual(Math.min(total, e.currentTarget.currentTime))}
        onError={() => {
          setSonando(false);
          setError(true);
        }}
      />
      <button
        type="button"
        onClick={() => void alternar()}
        aria-label={sonando ? "Pausar la nota de voz" : "Escuchar la nota de voz"}
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-colors",
          mio ? "bg-acento hover:bg-acento-hover" : "bg-tinta hover:bg-grafito",
        )}
      >
        {sonando ? (
          <Pause aria-hidden="true" className="size-4 fill-current" />
        ) : (
          <Play aria-hidden="true" className="ml-0.5 size-4 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={total}
          step={0.1}
          value={actual}
          onChange={(e) => saltar(Number(e.target.value))}
          aria-label="Posición de la nota de voz"
          aria-valuetext={`${duracionAudio(actual)} de ${duracionAudio(total)}`}
          className="block h-1.5 w-full cursor-pointer accent-acento"
        />
        <p className="mt-1 flex justify-between text-[11px] text-gris tabular-nums">
          <span>
            {error ? (
              <span className="text-error-oscuro">No se puede reproducir aquí</span>
            ) : (
              `🎤 ${duracionAudio(sonando || actual > 0 ? actual : total)}`
            )}
          </span>
        </p>
      </div>
    </div>
  );
}
