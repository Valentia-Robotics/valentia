import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Mensaje destacado en los formularios de cuenta: rojo para errores, verde para buenas noticias */
export function Aviso({
  tipo = "error",
  children,
}: {
  tipo?: "error" | "exito";
  children: ReactNode;
}) {
  const Icono = tipo === "error" ? CircleAlert : CircleCheck;
  return (
    <p
      role={tipo === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-control p-4 text-sm",
        tipo === "error" ? "bg-error/8 text-error-oscuro" : "bg-exito/8 text-exito",
      )}
    >
      <Icono aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
