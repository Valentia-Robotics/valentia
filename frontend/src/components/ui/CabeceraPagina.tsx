import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Retraso de entrada de cada bloque de la cabecera (clase .llegar de globals.css) */
const paso = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * CABECERA DE CADA PÁGINA (estilo «estudio»): papel cálido a todo el ancho, una línea pequeña que dice
 * dónde estás, el titular grande y, como mucho, una frase. Sin adornos: lo importante es el contenido
 * de debajo. Los tres bloques llegan uno detrás de otro, con calma.
 * Va FUERA del <Contenedor> de la página (ocupa todo el ancho).
 *   compacta → menos alto (carrito, checkout, cuenta…)
 *   children → botones o enlaces debajo de la entradilla
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
    <section className="bg-estudio text-tinta">
      <div
        className={cn(
          "mx-auto max-w-6xl px-4 sm:px-6",
          compacta ? "pt-10 pb-10 sm:pt-14 sm:pb-12" : "pt-14 pb-14 sm:pt-20 sm:pb-20",
        )}
      >
        {etiqueta && (
          <p className="llegar text-base text-gris" style={paso(0)}>
            {etiqueta}
          </p>
        )}
        <h1
          style={paso(1)}
          className={cn(
            "llegar titular-cartel max-w-3xl font-medium",
            Boolean(etiqueta) && "mt-3",
            compacta ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl lg:text-7xl",
          )}
        >
          {titulo}
        </h1>
        {entradilla && (
          <div
            className="llegar mt-5 max-w-xl text-lg leading-relaxed text-tinta/70 sm:text-xl"
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
