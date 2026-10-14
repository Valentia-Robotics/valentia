import { Clapperboard } from "lucide-react";
import { fuenteVideo } from "@/lib/video";

/** Vídeo de la lección: YouTube, Vimeo, un archivo .mp4 o un aviso si aún no hay vídeo */
export function ReproductorVideo({ url, titulo }: { url: string; titulo: string }) {
  const fuente = fuenteVideo(url);

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
          src={fuente.src}
          title={`Vídeo: ${titulo} (${fuente.proveedor})`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          className="size-full"
        />
      )}
      {fuente.tipo === "archivo" && (
        <video src={fuente.src} controls preload="metadata" className="size-full">
          Tu navegador no puede reproducir este vídeo.
        </video>
      )}
    </div>
  );
}
