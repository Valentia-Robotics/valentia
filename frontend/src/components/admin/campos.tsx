import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * CAMPOS DE FORMULARIO DEL PANEL
 * Todos llevan su etiqueta, una ayuda opcional y el mensaje de error
 * (que los lectores de pantalla leen junto al campo).
 * Se usan dentro de componentes de cliente ("use client").
 */

const claseControl = (error?: string) =>
  cn(
    "mt-1 w-full rounded-md bg-white px-3 text-sm ring-1 outline-none transition-shadow",
    "placeholder:text-gris-claro focus:ring-2 focus:ring-acento disabled:bg-niebla",
    error ? "ring-error" : "ring-linea",
  );

interface Envoltorio {
  etiqueta: string;
  error?: string;
  ayuda?: ReactNode;
  className?: string;
}

function Marco({
  id,
  etiqueta,
  error,
  ayuda,
  className,
  children,
}: Envoltorio & { id: string; children: ReactNode }) {
  const descripcion = error ?? ayuda;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-medium">
        {etiqueta}
      </label>
      {children}
      {descripcion && (
        <p id={`${id}-d`} className={cn("mt-1 text-xs", error ? "text-error" : "text-gris")}>
          {descripcion}
        </p>
      )}
    </div>
  );
}

function aria(id: string, { error, ayuda }: Envoltorio) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || ayuda ? `${id}-d` : undefined,
  };
}

/** Campo de una línea (texto, número, URL…) */
export function CampoAdmin({
  etiqueta,
  error,
  ayuda,
  className,
  ...input
}: Envoltorio & Omit<ComponentProps<"input">, "id" | "className">) {
  const id = useId();
  return (
    <Marco {...{ id, etiqueta, error, ayuda, className }}>
      <input
        {...aria(id, { etiqueta, error, ayuda })}
        className={cn(claseControl(error), "h-9")}
        {...input}
      />
    </Marco>
  );
}

/** Texto de varias líneas */
export function AreaAdmin({
  etiqueta,
  error,
  ayuda,
  className,
  rows = 4,
  ...area
}: Envoltorio & Omit<ComponentProps<"textarea">, "id" | "className">) {
  const id = useId();
  return (
    <Marco {...{ id, etiqueta, error, ayuda, className }}>
      <textarea
        {...aria(id, { etiqueta, error, ayuda })}
        rows={rows}
        className={cn(claseControl(error), "py-2 leading-relaxed")}
        {...area}
      />
    </Marco>
  );
}

/** Lista desplegable */
export function SelectorAdmin({
  etiqueta,
  error,
  ayuda,
  className,
  opciones,
  ...select
}: Envoltorio & {
  opciones: { valor: string; texto: string }[];
} & Omit<ComponentProps<"select">, "id" | "className" | "children">) {
  const id = useId();
  return (
    <Marco {...{ id, etiqueta, error, ayuda, className }}>
      <select
        {...aria(id, { etiqueta, error, ayuda })}
        className={cn(claseControl(error), "h-9")}
        {...select}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </Marco>
  );
}

/** Casilla de sí/no */
export function CasillaAdmin({
  etiqueta,
  ayuda,
  className,
  ...input
}: { etiqueta: string; ayuda?: string; className?: string } & Omit<
  ComponentProps<"input">,
  "type" | "className"
>) {
  return (
    <label className={cn("flex items-start gap-2.5 text-sm", className)}>
      <input type="checkbox" className="mt-0.5 size-4 accent-acento" {...input} />
      <span>
        <span className="font-medium">{etiqueta}</span>
        {ayuda && <span className="block text-xs text-gris">{ayuda}</span>}
      </span>
    </label>
  );
}
