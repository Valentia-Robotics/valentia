import type { ReactNode } from "react";
import { Insignia } from "@/components/admin/Insignia";
import { estadosGuion, plataformasGuion } from "@/config/estadosGuion";
import type { EstadoGuion, PlataformaGuion } from "@/generated/prisma/enums";
import { fecha } from "@/lib/admin/formato";

/** Etiqueta con el estado de un guion */
export function InsigniaEstadoGuion({ estado }: { estado: EstadoGuion }) {
  const { nombre, tono } = estadosGuion[estado];
  return <Insignia tono={tono}>{nombre}</Insignia>;
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="font-sans text-xs font-semibold tracking-wide text-gris uppercase">
        {titulo}
      </h3>
      <div className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">{children}</div>
    </div>
  );
}

/** El guion en modo lectura: lo que ve el editor y el admin una vez aprobado */
export function TextoGuion({
  guion,
}: {
  guion: {
    categoria: { nombre: string };
    plataforma: PlataformaGuion;
    plataformaOtra: string | null;
    duracionObjetivo: string;
    gancho: string;
    desarrollo: string;
    llamadaAccion: string;
    notasVisuales: string;
    fechaLimite: Date;
    kit: { nombre: string } | null;
  };
}) {
  return (
    <div className="space-y-5">
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Categoría", guion.categoria.nombre],
          ["Plataforma", guion.plataformaOtra ?? plataformasGuion[guion.plataforma]],
          ["Duración objetivo", guion.duracionObjetivo],
          ["Fecha límite", fecha(guion.fechaLimite)],
          ["Kit relacionado", guion.kit?.nombre ?? "Ninguno"],
        ].map(([nombre, valor]) => (
          <div key={nombre}>
            <dt className="text-xs text-gris">{nombre}</dt>
            <dd className="font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
      <Bloque titulo="Gancho (primeros 3 segundos)">{guion.gancho}</Bloque>
      <Bloque titulo="Desarrollo">{guion.desarrollo}</Bloque>
      <Bloque titulo="Llamada a la acción">{guion.llamadaAccion}</Bloque>
      <Bloque titulo="Notas visuales para la edición">{guion.notasVisuales}</Bloque>
    </div>
  );
}
