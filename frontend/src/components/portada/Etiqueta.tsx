import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Línea pequeña encima de un titular («Cómo funciona», «Elige tu kit»…): dice de qué va el bloque.
 * Letra normal, gris y sin adornos.
 */
export function Etiqueta({
  children,
  oscura = false,
  className,
}: {
  children: React.ReactNode;
  oscura?: boolean;
  className?: string;
}) {
  return (
    <p className={cn("text-base", oscura ? "text-white/60" : "text-gris", className)}>{children}</p>
  );
}

/**
 * Divide un titular en palabras que suben una a una al cargar (clase .palabra-sube). El espacio va
 * FUERA de cada palabra: dentro de un inline-block se perdería y las palabras saldrían pegadas.
 */
export function PalabrasQueSuben({ texto }: { texto: string }) {
  return texto.split(" ").map((palabra, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span className="palabra-sube" style={{ "--i": i } as React.CSSProperties}>
        {palabra}
      </span>
    </Fragment>
  ));
}
