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
 *   bloque     → negro y recto (portada): al pasar el ratón se levanta con una sombra azul
 *   punteado   → recto, con borde de puntos (acción secundaria de la portada)
 *   punteado-claro → igual, en blanco, sobre la placa verde de la portada
 */
type Variante =
  | "primario"
  | "acento"
  | "secundario"
  | "claro"
  | "enlace"
  | "enlace-claro"
  | "peligro"
  | "bloque"
  | "punteado"
  | "punteado-claro";
type Tamano = "md" | "lg" | "xl";

const estilosVariante: Record<Variante, string> = {
  // Los de relleno se «levantan» al pasar el ratón, con una sombra recta (estilo taller)
  primario:
    "bg-tinta text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--color-acento)]",
  acento:
    "bg-acento text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--color-tinta)]",
  secundario:
    "border border-dotted border-tinta/60 text-tinta hover:border-solid hover:border-tinta hover:bg-tinta/5",
  claro:
    "bg-white text-tinta hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--color-acento-claro)]",
  enlace: "text-acento hover:underline underline-offset-4 px-0!",
  "enlace-claro": "text-acento-claro hover:underline underline-offset-4 px-0!",
  peligro: "bg-error text-white hover:bg-error/90",
  bloque:
    "rounded-recto! bg-tinta text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--color-acento)]",
  punteado:
    "rounded-recto! border border-dotted border-tinta text-tinta hover:border-solid hover:bg-white/60",
  "punteado-claro":
    "rounded-recto! border border-dotted border-white text-white hover:border-solid hover:bg-white/10",
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
    "transition-[background-color,border-color,color,scale,translate,box-shadow] active:scale-[0.97]",
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
