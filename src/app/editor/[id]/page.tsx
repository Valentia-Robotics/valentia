import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { FormularioEntrega, FormularioNotas } from "@/components/contenido/FormulariosEditor";
import { InsigniaEstadoGuion, TextoGuion } from "@/components/contenido/TextoGuion";
import { ESTADOS_DE_TRABAJO } from "@/config/estadosGuion";
import { empezarGuion } from "@/app/editor/acciones";
import { fechaHora } from "@/lib/admin/formato";
import { guionDelEditor } from "@/lib/contenido/guiones";
import { esId } from "@/lib/ids";
import { exigirEditor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Guion" };

interface Props {
  params: Promise<{ id: string }>;
}

/** Un guion del editor. Si es de otra persona, la consulta no lo encuentra y da 404. */
export default async function GuionEditor({ params }: Props) {
  const { id } = await params;
  const editor = await exigirEditor(`/editor/${id}`);
  if (!esId(id)) notFound();
  const guion = await guionDelEditor(id, editor.id);
  if (!guion) notFound();

  const comentarios = guion.historial.filter((c) => c.comentario);

  return (
    <>
      <Cabecera
        titulo={guion.titulo}
        descripcion={<InsigniaEstadoGuion estado={guion.estado} />}
        volver={{ href: "/editor", etiqueta: "Mis guiones" }}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          <Caja titulo="Guion aprobado">
            <TextoGuion guion={guion} />
          </Caja>
          <Caja titulo="Tu zona de trabajo">
            {ESTADOS_DE_TRABAJO.includes(guion.estado) ? (
              <FormularioNotas guionId={guion.id} notas={guion.notasEditor} />
            ) : (
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                {guion.notasEditor || "No escribiste notas."}
              </p>
            )}
          </Caja>
        </div>

        <div className="min-w-0 space-y-4">
          {comentarios.length > 0 && (
            <Caja titulo="Comentarios de cambios">
              <ul className="space-y-3 text-sm">
                {comentarios.map((c) => (
                  <li key={c.id}>
                    <p className="break-words whitespace-pre-wrap">{c.comentario}</p>
                    <p className="mt-0.5 text-xs text-gris">
                      {c.usuarioNombre} · {fechaHora(c.fecha)}
                    </p>
                  </li>
                ))}
              </ul>
            </Caja>
          )}

          <Caja titulo="Tu entrega">
            {guion.estado === "ASIGNADO" && (
              <BotonConfirmar
                accion={empezarGuion}
                datos={{ guionId: guion.id }}
                titulo="Empezar este guion"
                texto="El guion pasará a «En progreso»."
                confirmar="Sí, empezar"
                variante="primario"
              >
                Empezar
              </BotonConfirmar>
            )}
            {guion.estado === "EN_PROGRESO" && (
              <FormularioEntrega guionId={guion.id} enlace={guion.enlaceVideo} />
            )}
            {(guion.estado === "ENTREGADO" || guion.estado === "COMPLETADO") && (
              <div className="text-sm">
                <p>
                  {guion.estado === "COMPLETADO"
                    ? "¡Completado! La entrega está aceptada."
                    : "Entregado. Falta la revisión."}
                </p>
                {guion.enlaceVideo && (
                  <a
                    href={guion.enlaceVideo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block break-all text-acento underline"
                  >
                    {guion.enlaceVideo}
                  </a>
                )}
              </div>
            )}
          </Caja>
        </div>
      </div>
    </>
  );
}
