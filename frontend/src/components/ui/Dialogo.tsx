"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  /**
   * "centro" = ventana en mitad de la pantalla · "abajo" = panel que sube desde abajo (móvil) ·
   * "grande" = toda la pantalla en el móvil y una ventana grande en el ordenador, para contenido que
   * llena el hueco (el visor 3D de una pieza): sin scroll, y el contenido ocupa lo que deja la cabecera
   */
  posicion?: "centro" | "abajo" | "grande";
  children: ReactNode;
  className?: string;
}

/**
 * Ventana emergente accesible. Usa el elemento <dialog> del navegador, que ya
 * se encarga de cerrar con Escape, de no dejar salir el foco del teclado y de
 * anunciarse a los lectores de pantalla. Se cierra también al pulsar fuera.
 */
export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  posicion = "centro",
  children,
  className,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  // Abre o cierra el <dialog> cuando cambia "abierto"
  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onClose={alCerrar}
      // Un clic en el fondo oscuro (fuera del contenido) cierra la ventana
      onClick={(e) => e.target === e.currentTarget && alCerrar()}
      className={cn(
        "bg-white p-0 text-tinta shadow-flotante",
        "backdrop:bg-tinta/50 lg:backdrop:backdrop-blur-sm",
        posicion === "centro" &&
          "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-tarjeta open:animate-dialogo",
        posicion === "abajo" &&
          "mx-0 mt-auto mb-0 max-h-[88dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-tarjeta open:animate-subir",
        // `open:flex` y no `flex`: un <dialog> cerrado se esconde con display:none, y `flex` lo pisaría
        posicion === "grande" &&
          "m-0 h-dvh max-h-none w-full max-w-none flex-col overflow-hidden open:flex open:animate-dialogo sm:m-auto sm:h-[min(88dvh,820px)] sm:w-[min(94vw,1200px)] sm:rounded-tarjeta",
        className,
      )}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-linea bg-white/90 px-5 py-3 backdrop-blur-md">
        <h2 id={idTitulo} className="text-lg font-medium">
          {titulo}
        </h2>
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar"
          className="inline-flex size-10 items-center justify-center rounded-full text-tinta/70 transition-colors hover:bg-tinta/5 hover:text-tinta"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
