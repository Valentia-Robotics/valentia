import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Etiqueta técnica de la portada: una fila de puntos y, debajo, el texto en letra de máquina
 * («Cómo funciona», «Elige tu kit»…). Sustituye a las etiquetas azules en mayúsculas de antes.
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
    <p className={cn("font-mono text-xs", oscura ? "text-gris-claro" : "text-tinta/70", className)}>
      <span aria-hidden="true" className="linea-puntos block h-1.5 w-14" />
      <span className="mt-2 block">{children}</span>
    </p>
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
