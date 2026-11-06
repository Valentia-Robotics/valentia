import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Aviso amable cuando una lista no tiene nada que enseñar (por ejemplo, la tienda sin kits todavía).
 * "children" = botones o enlaces para seguir.
 */
export function EstadoVacio({
  icono: Icono,
  titulo,
  texto,
  children,
  className,
}: {
  icono: LucideIcon;
  titulo: string;
  texto: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-12 max-w-2xl rounded-tarjeta bg-niebla p-8 sm:p-10", className)}>
      <Icono aria-hidden="true" className="size-10 text-acento" strokeWidth={1.5} />
      <h2 className="mt-4 text-2xl font-medium">{titulo}</h2>
      <p className="mt-2 text-gris">{texto}</p>
      {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
    </section>
  );
}
