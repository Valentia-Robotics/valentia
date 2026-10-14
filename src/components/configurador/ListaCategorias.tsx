"use client";

import { categorias } from "@/config/categorias";
import { cn } from "@/lib/utils";
import type { Categoria } from "@/types/catalogo";

interface Props {
  activa: Categoria;
  alCambiar: (categoria: Categoria) => void;
  /** Piezas del robot en cada categoría (se muestran como un numerito) */
  contadores: Partial<Record<Categoria, number>>;
}

/**
 * Categorías del configurador.
 * - En ordenador: columna de botones grandes con icono, como en un quiosco.
 * - En móvil: barra horizontal que se desliza con el dedo, fija arriba.
 */
export function ListaCategorias({ activa, alCambiar, contadores }: Props) {
  return (
    <nav
      aria-label="Categorías de componentes"
      className={cn(
        "sticky top-nav z-30 border-b border-linea bg-white/90 backdrop-blur-xl",
        "lg:top-[calc(var(--spacing-nav)+1.5rem)] lg:self-start lg:border-0 lg:bg-transparent lg:backdrop-blur-none",
      )}
    >
      <ul className="sin-barra flex snap-x gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:flex-col lg:gap-3 lg:overflow-visible lg:p-0">
        {categorias.map(({ id, nombre, icono: Icono }) => {
          const seleccionada = id === activa;
          const cantidad = contadores[id] ?? 0;
          return (
            <li key={id} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => alCambiar(id)}
                aria-pressed={seleccionada}
                className={cn(
                  "relative flex items-center gap-2 rounded-boton px-4 py-2.5 text-sm font-medium transition-colors",
                  "lg:w-full lg:flex-col lg:gap-2 lg:rounded-tarjeta lg:px-3 lg:py-5 lg:text-base",
                  seleccionada ? "bg-tinta text-white" : "bg-niebla text-tinta hover:bg-linea/60",
                )}
              >
                <Icono
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className={cn(
                    "size-5 lg:size-9",
                    seleccionada ? "text-acento-claro" : "text-acento",
                  )}
                />
                {nombre}
                {cantidad > 0 && (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                      "lg:absolute lg:top-2.5 lg:right-2.5",
                      seleccionada ? "bg-white text-tinta" : "bg-acento text-white",
                    )}
                  >
                    {cantidad}
                    <span className="sr-only"> en tu robot</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
