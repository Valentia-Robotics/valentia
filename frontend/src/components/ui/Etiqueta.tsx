import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Pequeña etiqueta recta, en letra de máquina, para datos como "Principiante" o "+10 años". */
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
        "inline-flex items-center gap-1.5 rounded-recto px-2.5 py-1 font-mono text-xs",
        // Tienda industrial: chapa de datos con contorno fino, en mayúsculas
        "tienda:border tienda:border-linea tienda:bg-transparent tienda:text-[11px] tienda:tracking-[0.06em] tienda:text-tinta tienda:uppercase",
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
