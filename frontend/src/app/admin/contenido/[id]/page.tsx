import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { FormularioGuion } from "@/components/contenido/FormularioGuion";
import { FormularioAsignar, FormularioDevolver } from "@/components/contenido/FormulariosRevision";
import { InsigniaEstadoGuion, TextoGuion } from "@/components/contenido/TextoGuion";
import { ESTADOS_ASIGNABLES, ESTADOS_EDITABLES, estadosGuion } from "@/config/estadosGuion";
import {
  cambiarEstadoDeGuion,
  descartarGuionAutomatico,
  recuperarGuionDescartado,
} from "@/app/admin/contenido/acciones";
import { CajasAutomatico } from "@/components/contenido/CajasAutomatico";
import { InsigniaAutomatico } from "@/components/contenido/DatosAutomaticos";
import { fechaHora } from "@/lib/admin/formato";
import {
  ESTADOS_DESCARTABLES,
  categoriasGuion,
  editores as listaEditores,
  guionParaAdmin,
  kitsParaGuion,
} from "@/lib/contenido/guiones";
import { nombreEditor } from "@/config/equipo";
import { esId } from "@/lib/ids";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Guion" };

interface Props {
  params: Promise<{ id: string }>;
}

/** FICHA DE UN GUION: su texto, lo que se puede hacer en su estado actual y su historial */
export default async function GuionAdmin({ params }: Props) {
  const { id } = await params;
  await exigirAdmin(`/admin/contenido/${id}`);
  if (!esId(id)) notFound();
  const guion = await guionParaAdmin(id);
  if (!guion) notFound();

  const [categorias, kits, editores] = await Promise.all([
    categoriasGuion(),
    kitsParaGuion(),
    listaEditores(),
  ]);
  // Las desactivadas no se ofrecen, salvo la que ya tiene este guion
  const elegibles = categorias.filter((c) => c.activa || c.id === guion.categoriaId);
  const editable = ESTADOS_EDITABLES.includes(guion.estado);
  const asignable = ESTADOS_ASIGNABLES.includes(guion.estado);
  // Solo los automáticos sin editor: un guion manual se corrige, no se tira
  /** Idea de un editor: volver a borrador se la devuelve (vuelve a ser solo suya) */
  const ideaEditor = guion.origen === "EDITOR";
  const descartable =
    guion.origen === "IA" && !guion.editorId && ESTADOS_DESCARTABLES.includes(guion.estado);
  const datos = { guionId: guion.id };

  return (
    <>
      <Cabecera
        titulo={guion.titulo}
        descripcion={
          <>
            <InsigniaEstadoGuion estado={guion.estado} />{" "}
            {guion.automatico ? (
              <InsigniaAutomatico
                relevancia={guion.automatico.relevancia}
                medio={guion.automatico.fuente.medio}
              />
            ) : (
              guion.origen === "IA" && <Insignia tono="acento">Generado con IA</Insignia>
            )}
            {guion.origen === "EDITOR" && (
              <Insignia tono="acento">Idea de {guion.creadoPor?.nombre ?? "un editor"}</Insignia>
            )}
            {guion.editor && ` · ${nombreEditor(guion.editor.rolFemenino)}: ${guion.editor.nombre}`}
          </>
        }
        volver={{ href: "/admin/contenido", etiqueta: "Contenido" }}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          {guion.automatico && <CajasAutomatico automatico={guion.automatico} />}
          <Caja titulo={editable ? "Editar guion" : "Guion"}>
            {editable ? (
              <FormularioGuion guion={guion} categorias={elegibles} kits={kits} />
            ) : (
              <TextoGuion guion={guion} />
            )}
          </Caja>

          {(guion.notasEditor || guion.enlaceVideo) && (
            <Caja titulo="Trabajo del editor">
              {guion.enlaceVideo && (
                <p className="text-sm break-all">
                  <span className="font-medium">Vídeo: </span>
                  <a
                    href={guion.enlaceVideo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-acento underline"
                  >
                    {guion.enlaceVideo}
                  </a>
                </p>
              )}
              {guion.notasEditor && (
                <p className="mt-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {guion.notasEditor}
                </p>
              )}
            </Caja>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {guion.estado !== "COMPLETADO" && (
            <Caja titulo="Siguiente paso">
              <div className="space-y-3">
                {guion.estado === "BORRADOR" && (
                  <BotonConfirmar
                    accion={cambiarEstadoDeGuion}
                    datos={{ ...datos, a: "PENDIENTE_APROBACION" }}
                    titulo="Enviar a aprobación"
                    texto="El guion pasará a «Pendiente de aprobación»."
                    confirmar="Sí, enviar"
                    variante="primario"
                  >
                    Enviar a aprobación
                  </BotonConfirmar>
                )}
                {guion.estado === "PENDIENTE_APROBACION" && (
                  <BotonConfirmar
                    accion={cambiarEstadoDeGuion}
                    datos={{ ...datos, a: "APROBADO" }}
                    titulo="Aprobar guion"
                    texto="Una vez aprobado se podrá asignar a un editor."
                    confirmar="Sí, aprobar"
                    variante="primario"
                  >
                    Aprobar
                  </BotonConfirmar>
                )}
                {asignable && (
                  <FormularioAsignar
                    guionId={guion.id}
                    editores={editores.filter((e) => e.email !== guion.editor?.email)}
                    reasignar={guion.estado !== "APROBADO"}
                    sugerido={
                      guion.origen === "EDITOR" && guion.creadoPor ? guion.creadoPor.id : undefined
                    }
                  />
                )}
                {(guion.estado === "PENDIENTE_APROBACION" || guion.estado === "APROBADO") && (
                  <BotonConfirmar
                    accion={cambiarEstadoDeGuion}
                    datos={{ ...datos, a: "BORRADOR" }}
                    titulo={ideaEditor ? "Devolver a su autor" : "Volver a borrador"}
                    texto={
                      ideaEditor
                        ? "Vuelve a ser un borrador de quien la propuso: dejarás de verla hasta que te la envíe otra vez. Cuéntale qué cambiar por Mensajes."
                        : "Podrás corregir el texto, y tendrás que aprobarlo otra vez antes de asignarlo."
                    }
                    confirmar={ideaEditor ? "Sí, devolver" : "Sí, volver a borrador"}
                    variante="secundario"
                  >
                    {ideaEditor ? "Devolver a su autor" : "Corregir (volver a borrador)"}
                  </BotonConfirmar>
                )}
                {descartable && (
                  <BotonConfirmar
                    accion={descartarGuionAutomatico}
                    datos={datos}
                    titulo="Descartar guion"
                    texto="El guion no se borra: pasa a «Descartado» (filtro Estado) y puedes recuperarlo cuando quieras. Si n8n vuelve a mandar esta noticia, no se creará otra vez."
                    confirmar="Sí, descartar"
                    variante="peligro"
                  >
                    Descartar
                  </BotonConfirmar>
                )}
                {guion.estado === "DESCARTADO" && (
                  <BotonConfirmar
                    accion={recuperarGuionDescartado}
                    datos={datos}
                    titulo="Recuperar guion"
                    texto="Vuelve a «Pendiente de aprobación» y a salir en la lista."
                    confirmar="Sí, recuperar"
                    variante="primario"
                  >
                    Recuperar
                  </BotonConfirmar>
                )}
                {guion.estado === "ENTREGADO" && (
                  <>
                    <BotonConfirmar
                      accion={cambiarEstadoDeGuion}
                      datos={{ ...datos, a: "COMPLETADO" }}
                      titulo="Marcar como completado"
                      texto="La entrega queda aceptada y el guion, terminado."
                      confirmar="Sí, completar"
                      variante="primario"
                    >
                      Marcar completado
                    </BotonConfirmar>
                    <FormularioDevolver guionId={guion.id} />
                  </>
                )}
              </div>
            </Caja>
          )}

          <Caja titulo="Historial">
            <ol className="space-y-3 text-sm">
              {guion.historial.map((cambio) => (
                <li key={cambio.id}>
                  <p className="font-medium">{estadosGuion[cambio.estadoNuevo].nombre}</p>
                  <p className="text-xs text-gris">
                    {cambio.usuarioNombre} · {fechaHora(cambio.fecha)}
                  </p>
                  {cambio.comentario && (
                    <p className="mt-1 text-[13px] break-words whitespace-pre-wrap">
                      {cambio.comentario}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Caja>
        </div>
      </div>
    </>
  );
}
