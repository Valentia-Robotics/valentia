"use client";

import { guardarEjercicio } from "@/app/admin/cursos/acciones";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { Caja } from "./Caja";
import { AreaAdmin, CampoAdmin } from "./campos";
import { ListaEditable } from "./ListaEditable";
import { useFormulario } from "./useFormulario";

export interface EjercicioFormulario {
  id: string;
  enunciado: string;
  opciones: string[];
  correcta: number | null;
  explicacion: string | null;
  pistas: string[];
  solucion: string | null;
}

/**
 * Formulario de un ejercicio:
 *   TEST → pregunta, opciones (marca la correcta) y explicación
 *   RETO → enunciado, pistas que se desbloquean en orden y solución
 */
export function FormularioEjercicio({
  tipo,
  cursoId,
  leccionId,
  ejercicio,
}: {
  tipo: "TEST" | "RETO";
  cursoId: string;
  leccionId: string;
  ejercicio?: EjercicioFormulario;
}) {
  const { estado, alEnviar, enviando, error } = useFormulario(guardarEjercicio);
  const e = ejercicio;

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-6">
      <input type="hidden" name="cursoId" value={cursoId} />
      <input type="hidden" name="leccionId" value={leccionId} />
      <input type="hidden" name="tipo" value={tipo} />
      {e && <input type="hidden" name="ejercicioId" value={e.id} />}
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}

      <Caja titulo={tipo === "TEST" ? "Pregunta" : "Reto"}>
        <AreaAdmin
          etiqueta={tipo === "TEST" ? "Pregunta" : "Enunciado del reto"}
          name="enunciado"
          defaultValue={e?.enunciado}
          error={error("enunciado")}
          rows={tipo === "TEST" ? 2 : 4}
        />
      </Caja>

      {tipo === "TEST" ? (
        <>
          <Caja titulo="Opciones">
            <p className="mb-3 text-xs text-gris">
              Escribe las respuestas posibles (de 2 a 6) y marca la correcta.
            </p>
            {error("opciones") && <p className="mb-2 text-xs text-error">{error("opciones")}</p>}
            {error("correcta") && <p className="mb-2 text-xs text-error">{error("correcta")}</p>}
            <ListaEditable
              inicial={
                e?.opciones.length
                  ? e.opciones.map((texto, i) => ({ texto, correcta: i === e.correcta }))
                  : [
                      { texto: "", correcta: true },
                      { texto: "", correcta: false },
                    ]
              }
              vacia={{ texto: "", correcta: false }}
              maximo={6}
              ordenable
              textoAnadir="Añadir opción"
              fila={(opcion, i) => (
                <div className="flex items-start gap-3">
                  <label className="mt-7 flex shrink-0 items-center gap-1.5 text-xs text-gris">
                    {/* El valor es la posición actual: si mueves las filas, se actualiza solo */}
                    <input
                      type="radio"
                      name="correcta"
                      value={i}
                      defaultChecked={opcion.correcta}
                      className="size-4 accent-exito"
                    />
                    Correcta
                  </label>
                  <CampoAdmin
                    etiqueta={`Opción ${i + 1}`}
                    name="opcion"
                    defaultValue={opcion.texto}
                    error={error(`opciones.${i}`)}
                    className="flex-1"
                  />
                </div>
              )}
            />
          </Caja>
          <Caja titulo="Explicación">
            <AreaAdmin
              etiqueta="Por qué es la respuesta correcta"
              name="explicacion"
              defaultValue={e?.explicacion ?? ""}
              error={error("explicacion")}
              ayuda="El alumno la ve después de responder."
              rows={3}
            />
          </Caja>
        </>
      ) : (
        <>
          <Caja titulo="Pistas">
            <p className="mb-3 text-xs text-gris">
              Se desbloquean de una en una, en este orden. De 1 a 6 pistas.
            </p>
            {error("pistas") && <p className="mb-2 text-xs text-error">{error("pistas")}</p>}
            <ListaEditable
              inicial={e?.pistas.length ? e.pistas : [""]}
              vacia=""
              maximo={6}
              ordenable
              textoAnadir="Añadir pista"
              fila={(pista, i) => (
                <AreaAdmin
                  etiqueta={`Pista ${i + 1}`}
                  name="pista"
                  defaultValue={pista}
                  error={error(`pistas.${i}`)}
                  rows={2}
                />
              )}
            />
          </Caja>
          <Caja titulo="Solución">
            <AreaAdmin
              etiqueta="Solución completa"
              name="solucion"
              defaultValue={e?.solucion ?? ""}
              error={error("solucion")}
              ayuda="El alumno puede desbloquearla cuando quiera. Puedes incluir código."
              rows={8}
              className="font-mono"
            />
          </Caja>
        </>
      )}

      <div className="flex justify-end gap-2">
        <BotonAdmin href={`/admin/cursos/${cursoId}/lecciones/${leccionId}`} variante="secundario">
          Volver a la lección
        </BotonAdmin>
        <BotonAdmin type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : e ? "Guardar ejercicio" : "Crear ejercicio"}
        </BotonAdmin>
      </div>
    </form>
  );
}
