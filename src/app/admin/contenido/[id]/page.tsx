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
import { cambiarEstadoDeGuion } from "@/app/admin/contenido/acciones";
import { fechaHora } from "@/lib/admin/formato";
import {
  categoriasGuion,
  editores as listaEditores,
  guionParaAdmin,
  kitsParaGuion,
} from "@/lib/contenido/guiones";
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
  const datos = { guionId: guion.id };

  return (
    <>
      <Cabecera
        titulo={guion.titulo}
        descripcion={
          <>
            <InsigniaEstadoGuion estado={guion.estado} />{" "}
            {guion.origen === "IA" && <Insignia tono="acento">Generado con IA</Insignia>}
            {guion.editor && ` · Editor: ${guion.editor.nombre}`}
          </>
        }
        volver={{ href: "/admin/contenido", etiqueta: "Contenido" }}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-4">
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
                  />
                )}
                {(guion.estado === "PENDIENTE_APROBACION" || guion.estado === "APROBADO") && (
                  <BotonConfirmar
                    accion={cambiarEstadoDeGuion}
                    datos={{ ...datos, a: "BORRADOR" }}
                    titulo="Volver a borrador"
                    texto="Podrás corregir el texto, y tendrás que aprobarlo otra vez antes de asignarlo."
                    confirmar="Sí, volver a borrador"
                    variante="secundario"
                  >
                    Corregir (volver a borrador)
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
