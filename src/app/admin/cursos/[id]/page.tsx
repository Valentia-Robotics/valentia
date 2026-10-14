import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, CirclePlay, GraduationCap, Plus, Users } from "lucide-react";
import { borrarCurso, moverLeccion } from "@/app/admin/cursos/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BarraPorcentaje } from "@/components/admin/BarraPorcentaje";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { BotonesMover } from "@/components/admin/BotonesMover";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { FormularioCurso } from "@/components/admin/FormularioCurso";
import { Insignia } from "@/components/admin/Insignia";
import { TarjetaDato } from "@/components/admin/TarjetaDato";
import { obtenerCursoAdmin, progresoDeCurso } from "@/lib/admin/cursos";
import { exigirAdmin } from "@/lib/sesion";
import { plural } from "@/lib/utils";
import { fuenteVideo } from "@/lib/video";

export const metadata: Metadata = { title: "Editar curso" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** UN CURSO: sus datos, el progreso de los alumnos y el temario (lecciones en orden) */
export default async function EditarCurso({ params, searchParams }: Props) {
  const { id } = await params;
  await exigirAdmin(`/admin/cursos/${id}`);
  const [curso, avisos] = await Promise.all([obtenerCursoAdmin(id), searchParams]);
  if (!curso) notFound();
  const progreso = await progresoDeCurso(curso.id, curso.lecciones.length);
  const minutos = curso.lecciones.reduce((total, l) => total + l.duracionMin, 0);

  return (
    <>
      <Cabecera
        titulo={curso.titulo}
        volver={{ href: "/admin/cursos", etiqueta: "Cursos" }}
        descripcion={
          curso.kit ? (
            <>
              Curso del kit{" "}
              <Link href={`/admin/kits/${curso.kit.id}`} className="underline">
                {curso.kit.nombre}
              </Link>
            </>
          ) : (
            "Este curso todavía no va con ningún kit: elígelo al crear o editar un kit."
          )
        }
        acciones={
          <BotonConfirmar
            accion={borrarCurso}
            datos={{ id: curso.id }}
            titulo="¿Borrar este curso?"
            texto={
              <>
                Vas a borrar <strong>{curso.titulo}</strong> con todas sus lecciones y ejercicios.
                No se puede deshacer. Si va con un kit o algún alumno lo tiene activado, no se podrá
                borrar.
              </>
            }
          >
            Borrar curso
          </BotonConfirmar>
        }
      />
      {avisos.creado && (
        <Aviso tipo="exito" className="mb-4">
          Curso creado. Ahora añade sus lecciones.
        </Aviso>
      )}
      {avisos.leccionBorrada && (
        <Aviso tipo="exito" className="mb-4">
          Lección borrada.
        </Aviso>
      )}

      {/* ---------- Progreso de los alumnos ---------- */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaDato titulo="Alumnos" valor={progreso.alumnos} icono={Users} />
        <TarjetaDato
          titulo="Progreso medio"
          valor={progreso.medio === null ? "—" : `${progreso.medio} %`}
          detalle="Lecciones completadas de media"
          icono={GraduationCap}
        />
        <TarjetaDato titulo="Lo han terminado" valor={progreso.terminados} icono={CircleCheck} />
        <TarjetaDato
          titulo="Temario"
          valor={curso.lecciones.length}
          detalle={`${plural(curso.lecciones.length, "lección", "lecciones")} · ${minutos} min`}
          icono={CirclePlay}
        />
      </div>

      {/* ---------- Lecciones ---------- */}
      <Caja
        titulo="Lecciones"
        className="mb-6"
        sinRelleno
        acciones={
          <BotonAdmin href={`/admin/cursos/${curso.id}/lecciones/nueva`} pequeno>
            <Plus aria-hidden="true" className="size-4" />
            Nueva lección
          </BotonAdmin>
        }
      >
        <ol className="divide-y divide-linea">
          {curso.lecciones.map((l, i) => {
            const completadas = progreso.porLeccion.get(l.id) ?? 0;
            const video = fuenteVideo(l.videoUrl);
            return (
              <li
                key={l.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-tinta text-xs text-white">
                    {l.orden}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/cursos/${curso.id}/lecciones/${l.id}`}
                      className="font-medium hover:underline"
                    >
                      {l.titulo}
                    </Link>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gris">
                      {l.duracionMin} min · {plural(l._count.ejercicios, "ejercicio", "ejercicios")}{" "}
                      {video.tipo === "pendiente" ? (
                        <Insignia tono="aviso">Sin vídeo</Insignia>
                      ) : (
                        <Insignia>
                          {video.tipo === "incrustado" ? video.proveedor : "Archivo"}
                        </Insignia>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:w-72">
                  <div className="flex-1">
                    <BarraPorcentaje
                      valor={
                        progreso.alumnos === 0
                          ? null
                          : Math.round((completadas / progreso.alumnos) * 100)
                      }
                    />
                  </div>
                  <BotonesMover
                    accion={moverLeccion}
                    datos={{ id: l.id, cursoId: curso.id }}
                    primero={i === 0}
                    ultimo={i === curso.lecciones.length - 1}
                    nombre={l.titulo}
                  />
                </div>
              </li>
            );
          })}
          {curso.lecciones.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-gris">
              Todavía no hay lecciones. Añade la primera con «Nueva lección».
            </li>
          )}
        </ol>
        {progreso.alumnos > 0 && (
          <p className="border-t border-linea px-5 py-2 text-xs text-gris">
            La barra de cada lección es el porcentaje de alumnos que la han completado.
          </p>
        )}
      </Caja>

      <FormularioCurso curso={curso} />
    </>
  );
}
