import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const estilos = {
  exito: { clases: "bg-exito/10 text-exito", Icono: CircleCheck },
  error: { clases: "bg-error/10 text-error", Icono: CircleAlert },
  info: { clases: "bg-acento/10 text-acento", Icono: Info },
} as const;

/** Mensaje destacado: "Guardado", "Hay errores en el formulario"… */
export function Aviso({
  tipo,
  children,
  className,
}: {
  tipo: keyof typeof estilos;
  children: ReactNode;
  className?: string;
}) {
  const { clases, Icono } = estilos[tipo];
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2 rounded-md px-3 py-2.5 text-sm", clases, className)}
    >
      <Icono aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
