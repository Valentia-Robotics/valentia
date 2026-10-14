"use client";

import { Eye, EyeOff } from "lucide-react";
import type { EstadoFormulario } from "@/lib/admin/formularios";
import { BotonAdmin } from "./BotonAdmin";
import { useFormulario } from "./useFormulario";

/** Botón "Ocultar / Mostrar" de las listas (componentes, kits). No pide confirmación: se puede deshacer. */
export function BotonVisibilidad({
  accion,
  id,
  visible,
}: {
  accion: (anterior: EstadoFormulario, formulario: FormData) => Promise<EstadoFormulario>;
  id: string;
  visible: boolean;
}) {
  const { alEnviar, enviando } = useFormulario(accion);
  return (
    <form onSubmit={alEnviar}>
      <input type="hidden" name="id" value={id} />
      <BotonAdmin type="submit" variante="suave" pequeno disabled={enviando}>
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
        {visible ? "Ocultar" : "Mostrar"}
      </BotonAdmin>
    </form>
  );
}
