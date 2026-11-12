"use client";

import Image from "next/image";
import { Rotate3d } from "lucide-react";
import { useState } from "react";
import { Dialogo } from "@/components/ui/Dialogo";
import { urlVisor3d } from "@/config/visor3d";
import { cn } from "@/lib/utils";
import type { ComponenteCatalogo } from "@/types/catalogo";

interface Props {
  componente: ComponenteCatalogo;
  /** Para colocar el botón (va en una esquina de la foto: el padre tiene que ser `relative`) */
  className?: string;
}

/**
 * «3D» en la esquina de la foto de una pieza: abre el visor 3D de Visualizalo (src/config/visor3d.ts)
 * en una ventana que en el móvil ocupa toda la pantalla. Las piezas sin modelo no pintan nada.
 *
 * Es un extra para mirar la pieza, no el camino de compra: un botón pequeño y claro sobre la foto, que
 * en la tarjeta va POR ENCIMA de la zona que abre el detalle (z-10), así un toque en él abre el 3D y
 * no la ficha.
 */
export function Ver3dPieza({ componente, className }: Props) {
  const url = urlVisor3d(componente.slug);
  const [abierto, setAbierto] = useState(false);
  const [cargado, setCargado] = useState(false);
  if (!url) return null;

  function cerrar() {
    setAbierto(false);
    setCargado(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Ver ${componente.nombre} en 3D, de cerca`}
        className={cn(
          "absolute top-2.5 right-2.5 z-10 inline-flex h-8 items-center gap-1 rounded-full bg-white/90 px-2.5 text-xs font-semibold text-tinta shadow-sm ring-1 ring-tinta/10 backdrop-blur-sm transition hover:bg-white hover:ring-acento/40 focus-visible:outline-2 focus-visible:outline-acento",
          className,
        )}
      >
        <Rotate3d aria-hidden="true" className="size-4 text-acento" />
        Verla en 3D
      </button>

      <Dialogo abierto={abierto} alCerrar={cerrar} titulo={componente.nombre} posicion="grande">
        <div className="relative min-h-0 flex-1 bg-niebla">
          {/* Mientras llega el visor, la misma foto: la ventana nunca se abre en blanco */}
          {!cargado && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              <Image
                src={componente.imagen}
                alt=""
                width={320}
                height={320}
                unoptimized
                className="aspect-square h-auto w-full max-w-64 animate-pulse"
              />
              <p className="text-sm text-gris">Cargando el modelo 3D…</p>
            </div>
          )}
          {/* El marco existe solo con la ventana abierta: no se descarga el modelo hasta que alguien
              lo pide, ni sigue gastando batería al cerrar */}
          {abierto && (
            <iframe
              src={url}
              title={`${componente.nombre} en 3D: gírala y acércate`}
              allow="fullscreen; xr-spatial-tracking"
              onLoad={() => setCargado(true)}
              className={cn(
                "absolute inset-0 size-full border-0 transition-opacity duration-300",
                cargado ? "opacity-100" : "opacity-0",
              )}
            />
          )}
        </div>
        {/* Crédito del visor (intercambio con Visualizalo, 12-11-2026): un enlace normal, sin nofollow,
            como los de SOCIOS_ENLACE del blog. Fuera del marco para no tapar los botones del visor. */}
        <p className="shrink-0 border-t border-tinta/10 bg-white px-4 py-2 text-right text-xs text-gris">
          Visor 3D de{" "}
          <a
            href="https://www.visualizalo.es"
            target="_blank"
            rel="noopener"
            className="font-medium text-tinta underline-offset-2 hover:underline"
          >
            Visualizalo
          </a>
        </p>
      </Dialogo>
    </>
  );
}
