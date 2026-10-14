"use client";

import { Check, Circle } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { marcarLeccion } from "@/app/(cuenta)/cursos/acciones";
import { cn } from "@/lib/utils";

interface Props {
  leccionId: string;
  completada: boolean;
}

/** "Marcar como completada". Cambia al momento y el servidor lo guarda por detrás. */
export function BotonCompletar({ leccionId, completada }: Props) {
  const [pendiente, iniciar] = useTransition();
  // useOptimistic: enseña el cambio antes de que conteste el servidor
  const [hecha, setHecha] = useOptimistic(completada);

  function alPulsar() {
    iniciar(async () => {
      setHecha(!hecha);
      await marcarLeccion(leccionId, !hecha);
    });
  }

  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={pendiente}
      aria-pressed={hecha}
      className={cn(
        "inline-flex h-12 items-center gap-2 rounded-boton px-6 font-medium transition-colors",
        hecha ? "bg-exito text-white hover:bg-exito/90" : "bg-tinta text-white hover:bg-grafito",
      )}
    >
      {hecha ? (
        <Check aria-hidden="true" className="size-5 animate-latido" />
      ) : (
        <Circle aria-hidden="true" className="size-5" />
      )}
      {hecha ? "Lección completada" : "Marcar como completada"}
    </button>
  );
}
