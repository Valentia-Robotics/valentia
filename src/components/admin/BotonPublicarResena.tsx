"use client";

import { Eye, EyeOff } from "lucide-react";
import { cambiarPublicacionResena } from "@/app/admin/resenas/acciones";
import { BotonAdmin } from "./BotonAdmin";
import { useFormulario } from "./useFormulario";

/** «Ocultar» una reseña publicada o «Publicar» una oculta/pendiente. Se puede deshacer: no pide confirmación. */
export function BotonPublicarResena({ id, publicada }: { id: string; publicada: boolean }) {
  const { alEnviar, enviando } = useFormulario(cambiarPublicacionResena);
  return (
    <form onSubmit={alEnviar}>
      <input type="hidden" name="id" value={id} />
      <BotonAdmin type="submit" variante="suave" pequeno disabled={enviando}>
        {publicada ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
        {publicada ? "Ocultar" : "Publicar"}
      </BotonAdmin>
    </form>
  );
}
