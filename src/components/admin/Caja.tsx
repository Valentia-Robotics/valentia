import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Recuadro blanco del panel. Con "titulo" lleva una cabecera con una línea debajo. */
export function Caja({
  titulo,
  acciones,
  children,
  className,
  sinRelleno,
}: {
  titulo?: string;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Sin margen interior (para tablas que llegan hasta el borde) */
  sinRelleno?: boolean;
}) {
  return (
    <section className={cn("rounded-lg bg-white ring-1 ring-linea", className)}>
      {titulo && (
        <div className="flex items-center justify-between gap-3 border-b border-linea px-4 py-3 sm:px-5">
          <h2 className="font-sans text-sm font-semibold">{titulo}</h2>
          {acciones}
        </div>
      )}
      <div className={sinRelleno ? undefined : "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}
