import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * CONTENEDOR DE PLANO (estilo CAD) de la tienda industrial.
 * Un rectángulo de línea fina con marcas de cruce en las cuatro esquinas y, opcionalmente, una
 * etiqueta de sección sobre el borde de arriba («// SEC_01 · SISTEMA») y una cota a la derecha.
 * Sustituye a las tarjetas flotantes con sombra: aquí nada flota, todo está acotado.
 */
export function MarcoCAD({
  children,
  etiqueta,
  cota,
  como: Etiqueta = "div",
  className,
  cruces = true,
}: {
  children: ReactNode;
  /** Texto sobre el borde superior izquierdo, en mono (p. ej. «SEC_02 · LÍNEA DE PRODUCTO») */
  etiqueta?: ReactNode;
  /** Texto sobre el borde superior derecho (referencia, revisión, coordenada…) */
  cota?: ReactNode;
  como?: ElementType;
  className?: string;
  /** Marcas de cruce en las esquinas */
  cruces?: boolean;
}) {
  return (
    <Etiqueta className={cn("relative border border-linea", className)}>
      {cruces && <Cruces />}
      {etiqueta && (
        <span className="mono-etiqueta absolute -top-2 left-4 bg-carbon px-1.5 text-gris">
          <span aria-hidden="true" className="text-acento">
            {"// "}
          </span>
          {etiqueta}
        </span>
      )}
      {cota && (
        <span className="mono-etiqueta absolute -top-2 right-4 bg-carbon px-1.5 text-gris-claro">
          {cota}
        </span>
      )}
      {children}
    </Etiqueta>
  );
}

/** Las cuatro cruces de las esquinas (también sirven sueltas dentro de otro contenedor relativo) */
export function Cruces({ className }: { className?: string }) {
  const esquinas = [
    "-top-[5px] -left-[5px]",
    "-top-[5px] -right-[5px]",
    "-bottom-[5px] -left-[5px]",
    "-bottom-[5px] -right-[5px]",
  ];
  return (
    <>
      {esquinas.map((posicion) => (
        <svg
          key={posicion}
          aria-hidden="true"
          viewBox="0 0 9 9"
          className={cn(
            "pointer-events-none absolute size-[9px] text-borde-fuerte",
            posicion,
            className,
          )}
        >
          <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" />
        </svg>
      ))}
    </>
  );
}
