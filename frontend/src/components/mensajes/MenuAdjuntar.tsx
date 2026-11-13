"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, ClipboardList, Images, Plus, Sticker, SwitchCamera, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * EL MENÚ «+» DEL CHAT (Jesse, 13-11-2026: «hazlo ordenado»). Todo lo que se puede adjuntar, en un
 * solo sitio, como en WhatsApp:
 *   Cámara · Galería · GIF · Sticker · Tarea
 * Los emojis siguen al lado del cuadro de texto (se usan mientras se escribe).
 */
export type OpcionAdjuntar = "camara" | "galeria" | "gif" | "sticker" | "tarea";

export function MenuAdjuntar({
  elegir,
  esTarea,
}: {
  elegir: (opcion: OpcionAdjuntar) => void;
  esTarea: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra al tocar fuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const usar = (opcion: OpcionAdjuntar) => {
    setAbierto(false);
    elegir(opcion);
  };

  const opciones: { id: OpcionAdjuntar; texto: string; icono: ReactNode; color: string }[] = [
    {
      id: "camara",
      texto: "Cámara",
      icono: <Camera aria-hidden="true" className="size-5" />,
      color: "bg-[#E8336D]",
    },
    {
      id: "galeria",
      texto: "Galería",
      icono: <Images aria-hidden="true" className="size-5" />,
      color: "bg-[#7F66FF]",
    },
    {
      id: "gif",
      texto: "GIF",
      icono: (
        <span
          aria-hidden="true"
          className="rounded-[4px] border-[1.5px] border-current px-1 text-[10px] leading-[14px] font-bold"
        >
          GIF
        </span>
      ),
      color: "bg-[#0795DC]",
    },
    {
      id: "sticker",
      texto: "Sticker",
      icono: <Sticker aria-hidden="true" className="size-5" />,
      color: "bg-[#02A698]",
    },
    {
      id: "tarea",
      texto: esTarea ? "Quitar tarea" : "Tarea",
      icono: <ClipboardList aria-hidden="true" className="size-5" />,
      color: "bg-[#FFA51F]",
    },
  ];

  return (
    <div ref={caja} className="shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-label="Adjuntar: cámara, galería, GIF, sticker o tarea"
        title="Adjuntar"
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-full text-gris transition-colors hover:bg-niebla hover:text-tinta",
          abierto && "bg-niebla text-tinta",
          esTarea && "text-aviso-oscuro",
        )}
      >
        <Plus
          aria-hidden="true"
          className={cn("size-6 transition-transform", abierto && "rotate-45")}
        />
      </button>
      {abierto && (
        <div
          role="menu"
          aria-label="Adjuntar"
          className="absolute bottom-full left-3 z-20 mb-2 grid w-[min(20rem,calc(100vw-1.5rem))] animate-tarjeta grid-cols-3 gap-1 rounded-xl border border-linea bg-white p-2 shadow-xl sm:w-auto sm:grid-cols-5"
        >
          {opciones.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              onClick={() => usar(o.id)}
              className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-tinta hover:bg-niebla focus-visible:bg-niebla focus-visible:outline-none"
            >
              <span
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-full text-white",
                  o.color,
                )}
              >
                {o.icono}
              </span>
              {o.texto}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** ¿Es un móvil o tableta? (ahí la cámara la abre el propio sistema, con su app de fotos) */
export const esPantallaTactil = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * LA CÁMARA EN EL ORDENADOR: en el móvil se usa la cámara del sistema (un <input capture>), pero en
 * el ordenador ese input solo abre el explorador de archivos. Aquí se ve la webcam y «Hacer foto»
 * la convierte en una imagen normal, que se envía como cualquier otra (con texto si quieres).
 */
export function CamaraWeb({
  alHacerFoto,
  alCerrar,
}: {
  alHacerFoto: (foto: File) => void;
  alCerrar: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(() =>
    typeof navigator.mediaDevices?.getUserMedia === "function"
      ? null
      : "Este navegador no deja usar la cámara. Elige una foto de la galería.",
  );
  const [lista, setLista] = useState(false);
  const [frontal, setFrontal] = useState(true);
  const [variasCamaras, setVariasCamaras] = useState(false);

  useEffect(() => {
    let flujo: MediaStream | null = null;
    let vivo = true;
    if (typeof navigator.mediaDevices?.getUserMedia !== "function") return;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: frontal ? "user" : "environment", width: { ideal: 1920 } },
        audio: false,
      })
      .then(async (f) => {
        if (!vivo) {
          f.getTracks().forEach((p) => p.stop());
          return;
        }
        flujo = f;
        if (video.current) {
          video.current.srcObject = f;
          await video.current.play().catch(() => undefined);
        }
        setLista(true);
        const aparatos = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (vivo) setVariasCamaras(aparatos.filter((a) => a.kind === "videoinput").length > 1);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        const nombre = e instanceof DOMException ? e.name : "";
        setError(
          nombre === "NotAllowedError"
            ? "No hay permiso para usar la cámara. Actívalo en el candado de la barra de direcciones."
            : nombre === "NotFoundError"
              ? "No encontramos ninguna cámara en este aparato."
              : "No se ha podido abrir la cámara. Prueba otra vez o elige una foto de la galería.",
        );
      });
    // Al cerrar, la cámara se apaga (se va la lucecita)
    return () => {
      vivo = false;
      flujo?.getTracks().forEach((p) => p.stop());
    };
  }, [frontal]);

  useEffect(() => {
    const escape = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [alCerrar]);

  const hacerFoto = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const lienzo = document.createElement("canvas");
    lienzo.width = v.videoWidth;
    lienzo.height = v.videoHeight;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;
    // La frontal se ve como en un espejo: la foto, igual que se ve en pantalla
    if (frontal) {
      ctx.translate(lienzo.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    lienzo.toBlob(
      (blob) => {
        if (!blob) return;
        alHacerFoto(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hacer una foto"
      className="fixed inset-0 z-[60] flex flex-col bg-tinta/95"
    >
      <div className="flex items-center gap-3 px-3 py-2 text-white sm:px-4">
        <Camera aria-hidden="true" className="size-5 shrink-0" />
        <p className="min-w-0 flex-1 font-medium">Hacer una foto</p>
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar la cámara"
          className="inline-flex size-10 items-center justify-center rounded-full hover:bg-white/10"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3">
        {error ? (
          <p role="alert" className="max-w-sm text-center text-white">
            {error}
          </p>
        ) : (
          <>
            <video
              ref={video}
              playsInline
              muted
              className={cn(
                "max-h-full max-w-full rounded-lg bg-black object-contain",
                frontal && "-scale-x-100",
              )}
            />
            {!lista && <p className="absolute text-sm text-white/80">Abriendo la cámara…</p>}
          </>
        )}
      </div>
      {!error && (
        <div className="flex items-center justify-center gap-6 px-3 pt-2 pb-6">
          <span className="size-11" />
          <button
            type="button"
            onClick={hacerFoto}
            disabled={!lista}
            aria-label="Hacer la foto"
            className="inline-flex size-16 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-transform hover:bg-white/40 active:scale-95 disabled:opacity-40"
          >
            <span className="size-11 rounded-full bg-white" />
          </button>
          {variasCamaras ? (
            <button
              type="button"
              onClick={() => {
                setLista(false);
                setFrontal((f) => !f);
              }}
              aria-label="Cambiar de cámara"
              className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10"
            >
              <SwitchCamera aria-hidden="true" className="size-6" />
            </button>
          ) : (
            <span className="size-11" />
          )}
        </div>
      )}
    </div>
  );
}
