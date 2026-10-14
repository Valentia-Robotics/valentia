import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Pequeña etiqueta redondeada para datos como "Principiante" o "+10 años". */
export function Etiqueta({
  children,
  tono = "claro",
  className,
}: {
  children: ReactNode;
  tono?: "claro" | "oscuro" | "acento";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-boton px-3 py-1 text-xs font-medium",
        tono === "claro" && "bg-tinta/5 text-tinta",
        tono === "oscuro" && "bg-white/10 text-white",
        tono === "acento" && "bg-acento/10 text-acento",
        className,
      )}
    >
      {children}
    </span>
  );
}
