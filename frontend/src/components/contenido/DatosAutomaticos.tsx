import { ExternalLink, TriangleAlert } from "lucide-react";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { fecha } from "@/lib/admin/formato";

interface Escena {
  orden: number;
  duracionSegundos: number | null;
  voz: string;
  visual: string;
  textoPantalla: string | null;
}

export interface Automatico {
  escenas: Escena[];
  fuente: { url: string; titulo: string | null; medio: string | null; fecha: Date | null };
  relevancia: number | null;
  datosAVerificar: string[];
  hashtags: string[];
  descripcionRedes: string | null;
  nivel: string | null;
  conexionValentia: string | null;
  modelo: string | null;
}

/** Etiqueta de la lista: «🤖 Automático · 8/10 · xataka.com» */
export function InsigniaAutomatico({
  relevancia,
  medio,
}: {
  relevancia?: number | null;
  medio?: string | null;
}) {
  return (
    <Insignia tono="acento">
      <span aria-hidden="true">🤖&nbsp;</span>Automático
      {relevancia ? ` · ${relevancia}/10` : ""}
      {medio ? ` · ${medio}` : ""}
    </Insignia>
  );
}

/** «0–10 s», «10–50 s»: el momento del vídeo en que va cada escena */
function tramos(escenas: Escena[]) {
  let inicio = 0;
  return escenas.map((e) => {
    if (e.duracionSegundos === null) return "—";
    const tramo = `${inicio}–${inicio + e.duracionSegundos} s`;
    inicio += e.duracionSegundos;
    return tramo;
  });
}

/** Lo que hay que comprobar antes de aprobar o grabar: bien visible, arriba */
export function DatosAVerificar({ datos }: { datos: string[] }) {
  if (datos.length === 0) return null;
  return (
    <div
      role="note"
      className="rounded-lg bg-aviso/10 p-4 text-sm text-aviso-oscuro ring-1 ring-aviso/30"
    >
      <p className="flex items-center gap-2 font-semibold">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        Datos a verificar antes de publicar
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 break-words">
        {datos.map((dato) => (
          <li key={dato}>{dato}</li>
        ))}
      </ul>
    </div>
  );
}

/** La noticia de la que sale el guion */
export function FuenteDelGuion({ automatico }: { automatico: Automatico }) {
  const { fuente } = automatico;
  return (
    <div className="space-y-3 text-sm">
      <a
        href={fuente.url}
        target="_blank"
        // nofollow: es un enlace a una web ajena que ha elegido una IA
        rel="noopener noreferrer nofollow"
        className="inline-flex items-start gap-1.5 font-medium break-all text-acento underline"
      >
        {fuente.titulo || fuente.url}
        <ExternalLink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      </a>
      <p className="text-gris">
        {[fuente.medio, fuente.fecha && fecha(fuente.fecha)].filter(Boolean).join(" · ")}
      </p>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          ["Relevancia", automatico.relevancia ? `${automatico.relevancia} / 10` : "—"],
          ["Nivel", automatico.nivel || "—"],
          ["Escrito por", automatico.modelo || "IA"],
        ].map(([nombre, valor]) => (
          <div key={nombre}>
            <dt className="text-xs text-gris">{nombre}</dt>
            <dd className="font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
      {automatico.conexionValentia && (
        <p className="break-words whitespace-pre-wrap">
          <span className="font-medium">Relación con Valentia: </span>
          {automatico.conexionValentia}
        </p>
      )}
    </div>
  );
}

/** Las escenas en una tabla: tiempo · voz · visual · rótulo */
export function TablaEscenas({ escenas }: { escenas: Escena[] }) {
  const tiempos = tramos(escenas);
  return (
    <Tabla columnas={["Tiempo", "Voz", "Visual", "Rótulo"]} etiqueta="Escenas del guion">
      {escenas.map((e, i) => (
        <tr key={`${e.orden}-${i}`} className="[&>td]:align-top">
          <td className="whitespace-nowrap text-gris tabular-nums">{tiempos[i]}</td>
          <td className="break-words whitespace-pre-wrap">{e.voz || "—"}</td>
          <td className="break-words whitespace-pre-wrap text-gris">{e.visual || "—"}</td>
          <td className="break-words">{e.textoPantalla || "—"}</td>
        </tr>
      ))}
    </Tabla>
  );
}

/** Texto para redes, si lo trae */
export function TextoRedes({ automatico }: { automatico: Automatico }) {
  if (!automatico.descripcionRedes && automatico.hashtags.length === 0) return null;
  return (
    <div className="space-y-2 text-sm">
      {automatico.descripcionRedes && (
        <p className="break-words whitespace-pre-wrap">{automatico.descripcionRedes}</p>
      )}
      {automatico.hashtags.length > 0 && (
        <p className="break-words text-acento">
          {automatico.hashtags.map((h) => `#${h}`).join(" ")}
        </p>
      )}
    </div>
  );
}
