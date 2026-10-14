"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { EstadoFormulario } from "@/lib/admin/formularios";
import { BotonAdmin } from "./BotonAdmin";
import { useFormulario } from "./useFormulario";

/**
 * Botones ↑ ↓ para cambiar el orden de una lección o de un ejercicio.
 * "datos" son los campos que necesita la acción (id, cursoId…).
 */
export function BotonesMover({
  accion,
  datos,
  primero,
  ultimo,
  nombre,
}: {
  accion: (anterior: EstadoFormulario, formulario: FormData) => Promise<EstadoFormulario>;
  datos: Record<string, string>;
  primero: boolean;
  ultimo: boolean;
  /** Para los lectores de pantalla: "Subir «Lección 2»" */
  nombre: string;
}) {
  const { alEnviar, enviando } = useFormulario(accion);
  const campos = Object.entries(datos).map(([clave, valor]) => (
    <input key={clave} type="hidden" name={clave} value={valor} />
  ));

  return (
    <div className="flex gap-0.5">
      <form onSubmit={alEnviar}>
        {campos}
        <input type="hidden" name="direccion" value="arriba" />
        <BotonAdmin
          type="submit"
          variante="suave"
          pequeno
          disabled={primero || enviando}
          aria-label={`Subir «${nombre}»`}
        >
          <ArrowUp aria-hidden="true" className="size-4" />
        </BotonAdmin>
      </form>
      <form onSubmit={alEnviar}>
        {campos}
        <input type="hidden" name="direccion" value="abajo" />
        <BotonAdmin
          type="submit"
          variante="suave"
          pequeno
          disabled={ultimo || enviando}
          aria-label={`Bajar «${nombre}»`}
        >
          <ArrowDown aria-hidden="true" className="size-4" />
        </BotonAdmin>
      </form>
    </div>
  );
}
