import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Botón reutilizable de Valentia.
 * - Si le pasas "href", se convierte en un enlace.
 * - Si no, es un botón normal.
 *
 * Variantes:
 *   primario   → negro (acción principal sobre fondo claro)
 *   acento     → azul circuito (Comprar, Añadir…)
 *   secundario → solo borde
 *   claro      → blanco, para usar sobre fondos oscuros
 *   enlace     → texto azul con flecha, al estilo "Más información ›"
 *   enlace-claro → igual, pero en azul claro para fondos oscuros
 *   peligro    → rojo, para confirmar algo que no se puede deshacer
 */
type Variante =
  "primario" | "acento" | "secundario" | "claro" | "enlace" | "enlace-claro" | "peligro";
type Tamano = "md" | "lg" | "xl";

const estilosVariante: Record<Variante, string> = {
  primario: "bg-tinta text-white hover:bg-grafito",
  acento: "bg-acento text-white hover:bg-acento-hover",
  secundario: "border border-tinta/20 text-tinta hover:border-tinta hover:bg-tinta/5",
  claro: "bg-white text-tinta hover:bg-niebla",
  enlace: "text-acento hover:underline underline-offset-4 px-0!",
  "enlace-claro": "text-acento-claro hover:underline underline-offset-4 px-0!",
  peligro: "bg-error text-white hover:bg-error/90",
};

const estilosTamano: Record<Tamano, string> = {
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
  // Tamaño "quiosco": botones grandes y fáciles de pulsar con el dedo
  xl: "h-16 px-9 text-lg",
};

interface PropsComunes {
  variante?: Variante;
  tamano?: Tamano;
  className?: string;
  children: ReactNode;
}

type PropsEnlace = PropsComunes & { href: string } & Omit<
    ComponentProps<typeof Link>,
    "href" | "className" | "children"
  >;
type PropsBoton = PropsComunes & { href?: undefined } & Omit<
    ComponentProps<"button">,
    "className" | "children"
  >;

export function Boton({
  variante = "primario",
  tamano = "md",
  className,
  children,
  ...resto
}: PropsEnlace | PropsBoton) {
  const clases = cn(
    "inline-flex items-center justify-center gap-2 rounded-boton font-medium whitespace-nowrap",
    // Al pulsar se hunde un poco: la respuesta se nota antes de que cargue nada
    "transition-[background-color,border-color,color,scale] active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50",
    estilosTamano[tamano],
    estilosVariante[variante],
    className,
  );

  // Con "href" → enlace
  if (resto.href !== undefined) {
    const propsEnlace = resto as Omit<PropsEnlace, keyof PropsComunes>;
    return (
      <Link className={clases} {...propsEnlace}>
        {children}
      </Link>
    );
  }

  // Sin "href" → botón (por defecto type="button" para que no envíe formularios sin querer)
  const { type = "button", ...propsBoton } = resto as Omit<PropsBoton, keyof PropsComunes>;
  return (
    <button type={type} className={clases} {...propsBoton}>
      {children}
    </button>
  );
}
