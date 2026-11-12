"use client";

import { Mail } from "lucide-react";
import { cambiarNovedades } from "@/app/(cuenta)/cuenta/acciones";
import { useFormulario } from "@/components/admin/useFormulario";
import { Boton } from "@/components/ui/Boton";
import { Aviso } from "./Aviso";

/**
 * ¿Quieres recibir los correos de novedades? Sale en «Mi cuenta» (siempre) y como pregunta
 * en «Mis cursos» (solo si aún no ha contestado: «pregunta»).
 */
export function PreferenciaNovedades({
  quiere,
  pregunta,
}: {
  /** true = sí · false = no · null = aún no lo ha dicho */
  quiere: boolean | null;
  pregunta?: boolean;
}) {
  const { estado, alEnviar, enviando } = useFormulario(cambiarNovedades);

  // Ya contestó desde la pregunta de «Mis cursos»: solo el aviso
  if (pregunta && estado.ok) {
    return <Aviso tipo="exito">{estado.mensaje}</Aviso>;
  }

  const boton = (valor: "si" | "no", texto: string, variante: "acento" | "secundario") => (
    <form onSubmit={alEnviar}>
      <input type="hidden" name="quiere" value={valor} />
      <Boton type="submit" variante={variante} disabled={enviando}>
        {texto}
      </Boton>
    </form>
  );

  if (pregunta) {
    return (
      <div className="flex flex-col gap-4 rounded-tarjeta bg-niebla p-5 ring-1 ring-linea sm:flex-row sm:items-center">
        <Mail aria-hidden="true" className="size-6 shrink-0 text-acento" />
        <p className="flex-1 text-sm">
          ¿Te avisamos por correo cuando saquemos kits nuevos? Serán pocos correos y te puedes dar
          de baja cuando quieras.
        </p>
        <div className="flex gap-2">
          {boton("si", "Sí, avisadme", "acento")}
          {boton("no", "No, gracias", "secundario")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      <p>
        {quiere
          ? "Ahora mismo te avisamos por correo de los kits nuevos y otras novedades."
          : "Ahora mismo no te mandamos correos de novedades."}
      </p>
      {quiere
        ? boton("no", "Dejar de recibirlas", "secundario")
        : boton("si", "Quiero recibirlas", "acento")}
    </div>
  );
}
