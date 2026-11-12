import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const colores = {
  blanco: "var(--color-white)",
  niebla: "var(--color-niebla)",
  tinta: "var(--color-tinta)",
  grafito: "var(--color-grafito)",
  placa: "var(--color-placa)",
} as const;

export type ColorFundido = keyof typeof colores;

/**
 * Paso gradual entre dos secciones de distinto color: así la página se lee como un recorrido
 * continuo y no como bloques apilados. Sin contenido, solo decoración.
 * El alto va con el contraste: de claro a oscuro hace falta más recorrido para que no se note el corte.
 */
export function Fundido({
  desde,
  hasta,
  corto = false,
}: {
  desde: ColorFundido;
  hasta: ColorFundido;
  corto?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("fundido", corto ? "h-16 sm:h-24" : "h-36 sm:h-52", "print:hidden")}
      style={
        { "--fundido-desde": colores[desde], "--fundido-hasta": colores[hasta] } as CSSProperties
      }
    />
  );
}
