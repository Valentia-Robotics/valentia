"use client";

import { CircleAlert, Sparkles } from "lucide-react";
import { useActionState } from "react";
import { activar, type EstadoActivacion } from "@/app/activar/acciones";
import { Boton } from "@/components/ui/Boton";

const estadoInicial: EstadoActivacion = {};

/** Botón grande "Activar mi curso" (llama a la acción del servidor) */
export function BotonActivar({ codigo }: { codigo: string }) {
  const [estado, enviar, enviando] = useActionState(activar, estadoInicial);

  return (
    <form action={enviar} className="mt-8">
      <input type="hidden" name="codigo" value={codigo} />
      {estado.mensaje && (
        <p
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-control bg-error/8 p-4 text-sm text-error"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {estado.mensaje}
        </p>
      )}
      <Boton type="submit" variante="acento" tamano="xl" disabled={enviando} className="w-full">
        <Sparkles aria-hidden="true" className="size-5" />
        {enviando ? "Activando…" : "Activar mi curso"}
      </Boton>
    </form>
  );
}
