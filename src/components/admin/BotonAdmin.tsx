import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Botón del panel: más pequeño y con esquinas menos redondeadas que los de la tienda.
 * Con "href" es un enlace; sin él, un botón (por defecto type="button").
 *   primario   → negro (Guardar, Crear)
 *   secundario → solo borde (Cancelar, Editar)
 *   peligro    → rojo (Borrar, Desactivar)
 *   suave      → sin borde (acciones pequeñas dentro de una tabla)
 */
type Variante = "primario" | "secundario" | "peligro" | "suave";

const estilos: Record<Variante, string> = {
  primario: "bg-tinta text-white hover:bg-grafito",
  secundario: "bg-white text-tinta ring-1 ring-linea hover:ring-tinta/40",
  peligro: "bg-error text-white hover:bg-error/90",
  suave: "text-tinta/80 hover:bg-tinta/5 hover:text-tinta",
};

interface Comunes {
  variante?: Variante;
  pequeno?: boolean;
  className?: string;
  children: ReactNode;
}

type Props =
  | (Comunes & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className">)
  | (Comunes & { href?: undefined } & Omit<ComponentProps<"button">, "className">);

export function BotonAdmin({
  variante = "primario",
  pequeno,
  className,
  children,
  ...resto
}: Props) {
  const clases = cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap",
    "transition-colors disabled:pointer-events-none disabled:opacity-50",
    pequeno ? "h-8 px-2.5 text-[13px]" : "h-9 px-3.5 text-sm",
    estilos[variante],
    className,
  );

  if (resto.href !== undefined) {
    return (
      <Link className={clases} {...(resto as ComponentProps<typeof Link>)}>
        {children}
      </Link>
    );
  }
  const { type = "button", ...boton } = resto as ComponentProps<"button">;
  return (
    <button type={type} className={clases} {...boton}>
      {children}
    </button>
  );
}
