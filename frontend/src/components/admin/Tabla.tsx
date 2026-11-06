import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tabla del panel. En pantallas estrechas se puede deslizar de lado
 * (solo la tabla, nunca la página entera).
 *
 *   <Tabla columnas={["Nombre", "Precio"]}>
 *     <tr>…</tr>
 *   </Tabla>
 */
export function Tabla({
  columnas,
  children,
  vacia,
  className,
  etiqueta = "Tabla",
}: {
  /** Títulos de las columnas. Un título vacío ("") no se ve, pero se lee en voz alta como "Acciones". */
  columnas: string[];
  children: ReactNode;
  /** Texto que se enseña si no hay filas */
  vacia?: ReactNode;
  className?: string;
  /** Nombre de la tabla para los lectores de pantalla (por defecto, "Tabla") */
  etiqueta?: string;
}) {
  return (
    // relative: el texto oculto de las cabeceras ("Acciones") no se sale del recuadro.
    // tabIndex y role: si la tabla se desliza de lado, se puede hacer con el teclado.
    <div
      className={cn(
        "relative overflow-x-auto focus-visible:ring-2 focus-visible:ring-acento",
        className,
      )}
      tabIndex={0}
      role="region"
      aria-label={etiqueta}
    >
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="border-b border-linea text-xs text-gris">
          <tr>
            {columnas.map((columna, i) => (
              <th key={i} scope="col" className="px-4 py-2.5 font-medium whitespace-nowrap">
                {columna || <span className="sr-only">Acciones</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-linea [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle">
          {children}
        </tbody>
      </table>
      {vacia && <div className="px-4 py-10 text-center text-sm text-gris">{vacia}</div>}
    </div>
  );
}
