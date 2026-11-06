"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  valor: number;
  alCambiar: (valor: number) => void;
  /** Por debajo de este valor no se puede bajar. Con 0, el botón "−" se convierte en papelera. */
  minimo?: number;
  maximo: number;
  /** Para lectores de pantalla, por ejemplo "Cantidad de Microservo SG90" */
  etiqueta: string;
  tamano?: "md" | "lg";
  className?: string;
}

/** Botones − y + con la cantidad en medio. Se reutiliza en el configurador y en el carrito. */
export function SelectorCantidad({
  valor,
  alCambiar,
  minimo = 0,
  maximo,
  etiqueta,
  tamano = "md",
  className,
}: Props) {
  const quitarDelTodo = minimo === 0 && valor <= 1;
  const tamanoBoton = tamano === "lg" ? "size-12" : "size-9";
  const tamanoIcono = tamano === "lg" ? "size-5" : "size-4";
  const estiloBoton = cn(
    "inline-flex items-center justify-center rounded-full transition-colors",
    "hover:bg-tinta/5 disabled:pointer-events-none disabled:opacity-35",
    tamanoBoton,
  );

  return (
    <div
      role="group"
      aria-label={etiqueta}
      className={cn("inline-flex items-center rounded-boton bg-white ring-1 ring-linea", className)}
    >
      <button
        type="button"
        onClick={() => alCambiar(valor - 1)}
        disabled={valor <= minimo}
        aria-label={quitarDelTodo ? "Quitar" : "Una menos"}
        className={estiloBoton}
      >
        {quitarDelTodo ? (
          <Trash2 aria-hidden="true" className={tamanoIcono} strokeWidth={1.8} />
        ) : (
          <Minus aria-hidden="true" className={tamanoIcono} />
        )}
      </button>
      <output
        aria-live="polite"
        className={cn(
          "min-w-8 text-center font-medium tabular-nums",
          tamano === "lg" ? "text-lg" : "text-sm",
        )}
      >
        {valor}
      </output>
      <button
        type="button"
        onClick={() => alCambiar(valor + 1)}
        disabled={valor >= maximo}
        aria-label="Una más"
        className={estiloBoton}
      >
        <Plus aria-hidden="true" className={tamanoIcono} />
      </button>
    </div>
  );
}
