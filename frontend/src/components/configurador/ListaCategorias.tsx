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
 * Categorías del banco de pruebas, en mono y numeradas como un selector de canal.
 * - En ordenador: columna fija a la izquierda; la activa lleva la raya naranja.
 * - En móvil: barra horizontal que se desliza con el dedo, fija arriba.
 */
export function ListaCategorias({ activa, alCambiar, contadores }: Props) {
  return (
    <nav
      aria-label="Categorías de componentes"
      className={cn(
        "sticky top-nav z-30 border-b border-linea bg-carbon/95 backdrop-blur-md",
        "lg:top-[calc(var(--spacing-nav)+1.5rem)] lg:self-start lg:border-0 lg:bg-transparent lg:backdrop-blur-none",
      )}
    >
      <p className="mono-etiqueta mb-2 hidden text-gris-claro lg:block">Categorías</p>
      <ul className="sin-barra flex snap-x overflow-x-auto px-4 sm:px-6 lg:flex-col lg:overflow-visible lg:border-t lg:border-linea lg:px-0">
        {categorias.map(({ id, nombre }, i) => {
          const seleccionada = id === activa;
          const cantidad = contadores[id] ?? 0;
          return (
            <li key={id} className="shrink-0 snap-start lg:border-b lg:border-linea">
              <button
                type="button"
                onClick={() => alCambiar(id)}
                aria-pressed={seleccionada}
                className={cn(
                  "mono-etiqueta relative flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors duration-100",
                  "max-lg:border-b-2 lg:border-l-2",
                  seleccionada
                    ? "border-acento bg-panel text-tinta"
                    : "border-transparent text-gris hover:bg-panel hover:text-tinta",
                )}
              >
                <span className={seleccionada ? "text-acento" : "text-gris-claro"}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{nombre}</span>
                {cantidad > 0 && (
                  <span className="text-tinta tabular-nums">
                    ×{cantidad}
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
