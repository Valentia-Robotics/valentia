import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tono = "neutro" | "exito" | "aviso" | "error" | "acento";

const tonos: Record<Tono, string> = {
  neutro: "bg-tinta/5 text-tinta/80",
  exito: "bg-exito/10 text-exito",
  aviso: "bg-aviso/10 text-aviso-oscuro",
  error: "bg-error/10 text-error-oscuro",
  acento: "bg-acento/10 text-acento",
};

/** Etiqueta pequeña de estado: "Oculto", "Usado", "Pagado"… */
export function Insignia({ tono = "neutro", children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tonos[tono],
      )}
    >
      {children}
    </span>
  );
}
