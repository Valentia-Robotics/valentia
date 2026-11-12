import type { ReactNode } from "react";
import { CampoPixeles } from "@/components/portada/CampoPixeles";
import { Etiqueta } from "@/components/portada/Etiqueta";
import { cn } from "@/lib/utils";

/**
 * CABECERA DE CADA PÁGINA (estilo «taller», el mismo de la portada): campo verde de placa a todo el
 * ancho con píxeles vivos, regla de colores en el borde, etiqueta técnica, titular de cartel y
 * entradilla en serif. Así todas las páginas se sienten de la misma web.
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
    <section className="campo-placa relative isolate overflow-hidden text-white">
      <CampoPixeles variante="cabecera" />
      <div aria-hidden="true" className="absolute inset-y-5 left-3 flex w-1.5 flex-col sm:left-5">
        <span className="flex-[5] bg-cobre" />
        <span className="flex-[2] bg-white" />
        <span className="flex-[3] bg-senal" />
      </div>
      <div
        className={cn(
          "relative mx-auto max-w-6xl px-8 sm:px-12",
          compacta ? "pt-10 pb-12 sm:pt-14 sm:pb-16" : "pt-14 pb-20 sm:pt-20 sm:pb-28",
        )}
      >
        {etiqueta && <Etiqueta oscura>{etiqueta}</Etiqueta>}
        <h1
          className={cn(
            "titular-cartel max-w-3xl font-medium",
            Boolean(etiqueta) && "mt-5",
            compacta ? "text-5xl sm:text-6xl" : "text-5xl sm:text-7xl lg:text-8xl",
          )}
        >
          {titulo}
        </h1>
        {entradilla && (
          <div className="mt-6 max-w-xl font-serif text-lg leading-snug sm:text-xl">
            {entradilla}
          </div>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
