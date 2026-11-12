import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Retraso de entrada de cada bloque de la cabecera (clase .llegar de globals.css) */
const paso = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * CABECERA DE CADA PÁGINA (tienda industrial): rejilla de plano a todo el ancho, la etiqueta de
 * sección en mono («// SEC_02 · LÍNEA DE PRODUCTO»), titular grande con el espaciado cerrado y,
 * como mucho, un párrafo técnico. Una línea fina la separa del contenido.
 * Va FUERA del <Contenedor> de la página (ocupa todo el ancho).
 *   compacta → menos alto (carrito, checkout, cuenta…)
 *   children → botones, enlaces o una tira de datos debajo de la entradilla
 */
export function CabeceraPagina({
  etiqueta,
  titulo,
  entradilla,
  compacta = false,
  children,
}: {
  etiqueta?: ReactNode;
  titulo: ReactNode;
  entradilla?: ReactNode;
  compacta?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="rejilla-plano border-b border-linea bg-carbon text-tinta">
      <div
        className={cn(
          "mx-auto max-w-6xl px-4 sm:px-6",
          compacta ? "pt-10 pb-10 sm:pt-12 sm:pb-12" : "pt-14 pb-14 sm:pt-20 sm:pb-16",
        )}
      >
        {etiqueta && (
          <p className="llegar mono-etiqueta text-gris" style={paso(0)}>
            <span aria-hidden="true" className="text-acento">
              {"// "}
            </span>
            {etiqueta}
          </p>
        )}
        <h1
          style={paso(1)}
          className={cn(
            "llegar titular-cartel max-w-4xl font-semibold",
            Boolean(etiqueta) && "mt-4",
            compacta ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl lg:text-7xl",
          )}
        >
          {titulo}
        </h1>
        {entradilla && (
          <div
            className="llegar mt-5 max-w-2xl text-base leading-relaxed text-gris sm:text-lg"
            style={paso(2)}
          >
            {entradilla}
          </div>
        )}
        {children && (
          <div className="llegar mt-8" style={paso(3)}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
