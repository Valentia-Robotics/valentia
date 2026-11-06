"use client";

import { guardarCurso } from "@/app/admin/cursos/acciones";
import { NIVELES } from "@/lib/validaciones/admin";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { Caja } from "./Caja";
import { AreaAdmin, CampoAdmin, SelectorAdmin } from "./campos";
import { useFormulario } from "./useFormulario";

/** Formulario para crear o editar los datos de un curso (las lecciones van aparte) */
export function FormularioCurso({
  curso,
}: {
  curso?: { id: string; slug: string; titulo: string; descripcion: string; nivel: string };
}) {
  const { estado, alEnviar, enviando, error } = useFormulario(guardarCurso);

  return (
    <form onSubmit={alEnviar} noValidate>
      {curso && <input type="hidden" name="id" value={curso.id} />}
      <Caja titulo="Datos del curso">
        {estado.mensaje && (
          <Aviso tipo={estado.ok ? "exito" : "error"} className="mb-4">
            {estado.mensaje}
          </Aviso>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoAdmin
            etiqueta="Título"
            name="titulo"
            defaultValue={curso?.titulo}
            error={error("titulo")}
          />
          {curso ? (
            <CampoAdmin
              etiqueta="Dirección (slug)"
              value={curso.slug}
              disabled
              ayuda={`/cursos/${curso.slug} · No se puede cambiar.`}
            />
          ) : (
            <CampoAdmin
              etiqueta="Dirección (slug)"
              name="slug"
              placeholder="Se crea sola a partir del título"
              error={error("slug")}
              ayuda="Opcional. Después no se puede cambiar."
            />
          )}
          <AreaAdmin
            etiqueta="Descripción"
            name="descripcion"
            defaultValue={curso?.descripcion}
            error={error("descripcion")}
            className="sm:col-span-2"
          />
          <SelectorAdmin
            etiqueta="Nivel"
            name="nivel"
            defaultValue={curso?.nivel ?? "Principiante"}
            error={error("nivel")}
            opciones={NIVELES.map((n) => ({ valor: n, texto: n }))}
          />
        </div>
        <div className="mt-5 flex justify-end">
          <BotonAdmin type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : curso ? "Guardar cambios" : "Crear curso"}
          </BotonAdmin>
        </div>
      </Caja>
    </form>
  );
}
