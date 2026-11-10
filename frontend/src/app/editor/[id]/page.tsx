import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { FormularioGuion } from "@/components/contenido/FormularioGuion";
import {
  FormularioEntrega,
  PasosEdicion,
  ZonaTrabajo,
} from "@/components/contenido/FormulariosEditor";
import { HerramientasGuion } from "@/components/contenido/HerramientasGuion";
import { InsigniaEstadoGuion, TextoGuion } from "@/components/contenido/TextoGuion";
import {
  DatosAVerificar,
  FuenteDelGuion,
  TablaEscenas,
  TextoRedes,
} from "@/components/contenido/DatosAutomaticos";
import {
  ESTADOS_DE_TRABAJO,
  plataformasGuion,
  textoDuracion,
  tiempoLectura,
  urgenciaGuion,
} from "@/config/estadosGuion";
import { duplicarGuion, empezarGuion, moverIdea } from "@/app/editor/acciones";
import { fecha, fechaHora } from "@/lib/admin/formato";
import { categoriasGuion, guionDelEditor, kitsParaGuion } from "@/lib/contenido/guiones";
import { esId } from "@/lib/ids";
import { exigirEditor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Guion" };

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Un guion del editor: uno asignado (leer, notas, pasos, teleprompter, entregar) o una idea suya
 * (escribirla, enviarla a revisión, archivarla). Si es de otra persona, la consulta no lo encuentra → 404.
 */
export default async function GuionEditor({ params }: Props) {
  const { id } = await params;
  const editor = await exigirEditor(`/editor/${id}`);
  if (!esId(id)) notFound();
  const guion = await guionDelEditor(id, editor.id);
  if (!guion) notFound();

  const idea = guion.origen === "EDITOR" && !guion.editorId;
  const escribiendo = idea && guion.estado === "BORRADOR";
  const [categorias, kits] = escribiendo
    ? await Promise.all([categoriasGuion(true), kitsParaGuion()])
    : [[], []];
  const notasEditables = idea
    ? guion.estado !== "DESCARTADO"
    : ESTADOS_DE_TRABAJO.includes(guion.estado);
  const comentarios = guion.historial.filter((c) => c.comentario);
  const urgencia = urgenciaGuion(guion.fechaLimite, guion.estado);
  const plataforma = guion.plataformaOtra ?? plataformasGuion[guion.plataforma];
  const lectura = tiempoLectura([guion.gancho, guion.desarrollo, guion.llamadaAccion]);
  const datosGuion = { guionId: guion.id };

  return (
    <>
      <Cabecera
        titulo={guion.titulo}
        descripcion={
          <span className="flex flex-wrap gap-1.5">
            {idea && <Insignia tono="acento">Idea tuya</Insignia>}
            <InsigniaEstadoGuion estado={guion.estado} />
            {urgencia && <Insignia tono={urgencia.tono}>{urgencia.texto}</Insignia>}
          </span>
        }
        volver={{ href: "/editor", etiqueta: "Mis guiones" }}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <HerramientasGuion
          guion={{
            titulo: guion.titulo,
            gancho: guion.gancho,
            desarrollo: guion.desarrollo,
            llamadaAccion: guion.llamadaAccion,
            notasVisuales: guion.notasVisuales,
            ficha: `${plataforma} · ${guion.duracionObjetivo} · fecha límite ${fecha(guion.fechaLimite)}`,
          }}
        />
        <p className="text-sm text-gris">
          ≈ {textoDuracion(lectura.segundos)} leído en voz alta ·{" "}
          {lectura.palabras.toLocaleString("es-ES")} palabras · objetivo {guion.duracionObjetivo}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          {guion.automatico && <DatosAVerificar datos={guion.automatico.datosAVerificar} />}
          {escribiendo ? (
            <Caja titulo="Escribe tu idea">
              <FormularioGuion guion={guion} categorias={categorias} kits={kits} idea />
            </Caja>
          ) : (
            <Caja titulo={idea ? "Tu idea" : "Guion aprobado"}>
              <TextoGuion guion={guion} />
            </Caja>
          )}
          {guion.automatico && (
            <>
              <Caja titulo="Escenas" sinRelleno>
                <TablaEscenas escenas={guion.automatico.escenas} />
              </Caja>
              <Caja titulo="Noticia de origen">
                <FuenteDelGuion automatico={guion.automatico} />
              </Caja>
              {(guion.automatico.descripcionRedes || guion.automatico.hashtags.length > 0) && (
                <Caja titulo="Para publicar en redes">
                  <TextoRedes automatico={guion.automatico} />
                </Caja>
              )}
            </>
          )}
          <Caja titulo="Tu zona de trabajo">
            {notasEditables ? (
              <ZonaTrabajo guionId={guion.id} notas={guion.notasEditor} />
            ) : (
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                {guion.notasEditor || "No escribiste notas."}
              </p>
            )}
          </Caja>
        </div>

        <div className="min-w-0 space-y-4 print:hidden">
          {idea ? (
            <Caja titulo="Tu idea">
              <EstadoIdea guionId={guion.id} estado={guion.estado} />
            </Caja>
          ) : (
            <>
              <Caja titulo="Pasos de edición">
                <PasosEdicion
                  guionId={guion.id}
                  hechos={guion.pasosHechos}
                  editable={ESTADOS_DE_TRABAJO.includes(guion.estado)}
                />
              </Caja>

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
                    datos={datosGuion}
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
            </>
          )}

          <Caja titulo="Reutilizar">
            <p className="mb-3 text-sm text-gris">
              Crea una idea nueva con este mismo texto, para adaptarlo a otro vídeo.
            </p>
            <BotonConfirmar
              accion={duplicarGuion}
              datos={datosGuion}
              titulo="Duplicar como idea nueva"
              texto="Se creará un borrador nuevo, solo tuyo, con una copia de este guion. Este no cambia."
              confirmar="Sí, duplicar"
              variante="secundario"
            >
              Duplicar como idea nueva
            </BotonConfirmar>
          </Caja>
        </div>
      </div>
    </>
  );
}

/** Qué pasa con una idea propia y qué puede hacer el autor en cada momento */
function EstadoIdea({ guionId, estado }: { guionId: string; estado: string }) {
  const datos = (a: string) => ({ guionId, a });

  if (estado === "BORRADOR") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-gris">
          Solo la ves tú. Cuando esté lista, envíala y administración la revisará.
        </p>
        <BotonConfirmar
          accion={moverIdea}
          datos={datos("PENDIENTE_APROBACION")}
          titulo="Enviar a revisión"
          texto="Administración verá tu idea. Mientras la revisa no podrás cambiar el texto (sí tus notas); si quieres seguir escribiendo, puedes retirarla."
          confirmar="Sí, enviar"
          variante="primario"
        >
          Enviar a revisión
        </BotonConfirmar>
        <BotonConfirmar
          accion={moverIdea}
          datos={datos("DESCARTADO")}
          titulo="Archivar idea"
          texto="No se borra: la encontrarás en la pestaña «Archivados» y podrás recuperarla cuando quieras."
          confirmar="Sí, archivar"
          variante="secundario"
        >
          Archivar
        </BotonConfirmar>
      </div>
    );
  }
  if (estado === "PENDIENTE_APROBACION") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-gris">Enviada. Administración la está revisando.</p>
        <BotonConfirmar
          accion={moverIdea}
          datos={datos("BORRADOR")}
          titulo="Retirar de revisión"
          texto="Vuelve a ser un borrador solo tuyo y podrás seguir escribiendo. Después, envíala otra vez."
          confirmar="Sí, retirar"
          variante="secundario"
        >
          Retirar para seguir escribiendo
        </BotonConfirmar>
      </div>
    );
  }
  if (estado === "APROBADO") {
    return (
      <p className="text-sm text-gris">
        ¡Aprobada! Falta que administración la asigne. Cuando te la asignen, aparecerá aquí como un
        guion más.
      </p>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      <p className="text-gris">Archivada. Solo la ves tú.</p>
      <BotonConfirmar
        accion={moverIdea}
        datos={datos("BORRADOR")}
        titulo="Recuperar idea"
        texto="Vuelve a tus borradores."
        confirmar="Sí, recuperar"
        variante="secundario"
      >
        Recuperar
      </BotonConfirmar>
    </div>
  );
}
