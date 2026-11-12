import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FilaDato {
  nombre: ReactNode;
  valor: ReactNode;
}

/**
 * MATRIZ DE ESPECIFICACIONES (tienda industrial): filas compactas «nombre · valor» separadas por
 * líneas finas. El nombre va en mono pequeño y gris; el valor, en mono claro. Sin rellenos ni cajas.
 *   columnas=2 → en pantallas anchas, dos columnas de filas (para listas largas)
 */
export function TablaDatos({
  filas,
  columnas = 1,
  className,
  densa = false,
}: {
  filas: FilaDato[];
  columnas?: 1 | 2;
  className?: string;
  densa?: boolean;
}) {
  if (filas.length === 0) return null;
  return (
    <dl
      className={cn(
        "grid border-t border-linea",
        columnas === 2 && "sm:grid-cols-2 sm:gap-x-8",
        className,
      )}
    >
      {filas.map((fila, i) => (
        <div
          key={i}
          className={cn(
            "flex items-baseline justify-between gap-4 border-b border-linea",
            densa ? "py-1.5" : "py-2.5",
          )}
        >
          <dt className="mono-etiqueta shrink-0 text-gris">{fila.nombre}</dt>
          <dd className="text-right font-mono text-[13px] leading-snug text-tinta">{fila.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
