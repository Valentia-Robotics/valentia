import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface Props extends Omit<ComponentProps<"input">, "id"> {
  etiqueta: string;
  /** Mensaje de error (si lo hay, el campo se marca en rojo) */
  error?: string;
  /** Texto de ayuda debajo del campo */
  ayuda?: string;
}

/**
 * Campo de formulario con su etiqueta, ayuda y mensaje de error.
 * Los lectores de pantalla leen el error junto al campo (aria-describedby).
 */
export function Campo({ etiqueta, error, ayuda, className, ...input }: Props) {
  const id = useId();
  const idDescripcion = `${id}-descripcion`;
  const descripcion = error ?? ayuda;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {etiqueta}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripcion ? idDescripcion : undefined}
        className={cn(
          "mt-1.5 h-12 w-full rounded-control bg-white px-4 text-base ring-1 transition-shadow outline-none",
          "placeholder:text-gris-claro focus:ring-2 focus:ring-acento",
          error ? "ring-error" : "ring-linea",
        )}
        {...input}
      />
      {descripcion && (
        <p id={idDescripcion} className={cn("mt-1.5 text-sm", error ? "text-error" : "text-gris")}>
          {descripcion}
        </p>
      )}
    </div>
  );
}
