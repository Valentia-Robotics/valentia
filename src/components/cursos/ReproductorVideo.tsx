"use client";

import { Clapperboard } from "lucide-react";
import { useEffect, useRef } from "react";
import type { FuenteVideo } from "@/lib/video";
import { escucharFinDelVideo, hayDetector } from "./finDelVideo";

interface Props {
  fuente: FuenteVideo;
  titulo: string;
  /** Se llama cuando el vídeo llega al final */
  alTerminar?: () => void;
  /** Se llama si no podemos saber cuándo termina (API bloqueada o servicio sin API) */
  sinDetector?: () => void;
}

/** Vídeo de la lección: YouTube, Vimeo, un archivo .mp4 o un aviso si aún no hay vídeo */
export function ReproductorVideo({ fuente, titulo, alTerminar, sinDetector }: Props) {
  const iframe = useRef<HTMLIFrameElement>(null);
  // Guardamos las funciones en refs para no volver a montar la API si cambian
  const terminar = useRef(alTerminar);
  const fallo = useRef(sinDetector);
  useEffect(() => {
    terminar.current = alTerminar;
    fallo.current = sinDetector;
  });

  const servicio = fuente.tipo === "incrustado" ? fuente.servicio : null;

  // Escuchamos el final del vídeo con la API oficial del servicio
  useEffect(() => {
    if (!servicio || !iframe.current) return;
    if (!hayDetector(servicio)) {
      fallo.current?.();
      return;
    }
    let dejar: (() => void) | undefined;
    let cancelado = false;
    escucharFinDelVideo(servicio, iframe.current, () => terminar.current?.())
      .then((funcion) => {
        if (cancelado) funcion();
        else dejar = funcion;
      })
      .catch(() => !cancelado && fallo.current?.());
    return () => {
      cancelado = true;
      dejar?.();
    };
  }, [servicio]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-tarjeta bg-tinta">
      {fuente.tipo === "pendiente" && (
        <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
          <Clapperboard
            aria-hidden="true"
            className="size-12 text-acento-claro"
            strokeWidth={1.3}
          />
          <p className="font-titulo text-xl">Estamos grabando este vídeo</p>
          <p className="max-w-sm text-sm text-gris-claro">
            Muy pronto lo verás aquí. Mientras tanto, lee la explicación y prueba los ejercicios.
          </p>
        </div>
      )}
      {fuente.tipo === "incrustado" && (
        <iframe
          ref={iframe}
          src={fuente.src}
          title={`Vídeo: ${titulo} (${fuente.proveedor})`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full"
        />
      )}
      {fuente.tipo === "archivo" && (
        <video
          src={fuente.src}
          controls
          preload="metadata"
          onEnded={() => terminar.current?.()}
          className="size-full"
        >
          Tu navegador no puede reproducir este vídeo.
        </video>
      )}
    </div>
  );
}
