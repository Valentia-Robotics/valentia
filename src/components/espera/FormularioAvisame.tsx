"use client";

import Link from "next/link";
import { useActionState } from "react";
import { apuntarseListaEspera, type EstadoListaEspera } from "@/app/(tienda)/listaEspera";
import { Boton } from "@/components/ui/Boton";
import { cn } from "@/lib/utils";

const inicial: EstadoListaEspera = { ok: false };

/**
 * Formulario «Avísame cuando abráis»: un email y un botón.
 * Se usa mientras la tienda no cobra (ver compraAbierta en src/lib/pagos).
 */
export function FormularioAvisame({
  origen,
  kitSlug,
  oscuro = false,
  className,
}: {
  origen: "portada" | "kit" | "checkout";
  kitSlug?: string;
  /** Sobre fondo oscuro (colores claros) */
  oscuro?: boolean;
  className?: string;
}) {
  const [estado, enviar, enviando] = useActionState(apuntarseListaEspera, inicial);

  if (estado.ok) {
    return (
      <p role="status" className={cn("text-base", oscuro ? "text-white" : "text-tinta", className)}>
        Apuntado. Te escribiremos a <strong className="font-medium">{estado.email}</strong> en
        cuanto abramos.
      </p>
    );
  }

  return (
    <form action={enviar} className={className}>
      <input type="hidden" name="origen" value={origen} />
      {kitSlug && <input type="hidden" name="kitSlug" value={kitSlug} />}
      {/* Trampa para programas automáticos: las personas no la ven */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          No rellenes esto
          <input type="text" name="web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`avisame-${origen}`} className="sr-only">
          Tu email
        </label>
        <input
          id={`avisame-${origen}`}
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="tu@email.com"
          defaultValue={estado.email}
          aria-invalid={estado.mensaje ? true : undefined}
          aria-describedby={estado.mensaje ? `avisame-${origen}-error` : undefined}
          className={cn(
            "h-12 w-full min-w-0 rounded-boton px-4 text-base outline-none focus:ring-2 sm:flex-1",
            oscuro
              ? "bg-white/10 text-white ring-1 ring-white/25 placeholder:text-white/50 focus:ring-acento-claro"
              : "bg-white text-tinta ring-1 ring-linea placeholder:text-gris-claro focus:ring-acento",
          )}
        />
        <Boton
          type="submit"
          variante={oscuro ? "claro" : "primario"}
          tamano="lg"
          disabled={enviando}
        >
          {enviando ? "Un momento…" : "Avísame"}
        </Boton>
      </div>
      {estado.mensaje && (
        <p
          id={`avisame-${origen}-error`}
          role="alert"
          className={cn("mt-2 text-sm", oscuro ? "text-white" : "text-error-oscuro")}
        >
          {estado.mensaje}
        </p>
      )}
      <p className={cn("mt-3 text-xs", oscuro ? "text-gris-claro" : "text-gris")}>
        Solo te escribiremos para eso. Si cambias de idea, nos lo dices y te borramos.{" "}
        <Link href="/legal/privacidad" className="underline underline-offset-2">
          Privacidad
        </Link>
      </p>
    </form>
  );
}
