import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListChecks, Puzzle } from "lucide-react";
import { borrarEjercicio, borrarLeccion, moverEjercicio } from "@/app/admin/cursos/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { BotonesMover } from "@/components/admin/BotonesMover";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { FormularioLeccion } from "@/components/admin/FormularioLeccion";
import { Insignia } from "@/components/admin/Insignia";
import { obtenerLeccionAdmin } from "@/lib/admin/cursos";
import { listaDeTextos } from "@/lib/catalogo";
import { exigirAdmin } from "@/lib/sesion";
import { plural } from "@/lib/utils";
import { analizarVideo, proveedoresVideo } from "@/lib/video";

export const metadata: Metadata = { title: "Editar lección" };

interface Props {
  params: Promise<{ id: string; leccionId: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** UNA LECCIÓN: sus datos, su vídeo y sus ejercicios */
export default async function EditarLeccion({ params, searchParams }: Props) {
  const { id, leccionId } = await params;
  const ruta = `/admin/cursos/${id}/lecciones/${leccionId}`;
  await exigirAdmin(ruta);
  const [leccion, avisos] = await Promise.all([obtenerLeccionAdmin(id, leccionId), searchParams]);
  if (!leccion) notFound();
  const alumnos = leccion._count.progreso;

  return (
    <>
      <Cabecera
        titulo={`${leccion.orden}. ${leccion.titulo}`}
        volver={{ href: `/admin/cursos/${id}`, etiqueta: leccion.curso.titulo }}
        descripcion={`${plural(alumnos, "alumno la ha completado", "alumnos la han completado")}.`}
        acciones={
          <BotonConfirmar
            accion={borrarLeccion}
            datos={{ id: leccion.id, cursoId: id }}
            titulo="¿Borrar esta lección?"
            texto={
              <>
                Vas a borrar <strong>{leccion.titulo}</strong> y sus{" "}
                {plural(leccion.ejercicios.length, "ejercicio", "ejercicios")}. No se puede
                deshacer.
                {alumnos > 0 &&
                  ` ${plural(alumnos, "alumno perderá", "alumnos perderán")} el progreso de esta lección.`}
              </>
            }
          >
            Borrar lección
          </BotonConfirmar>
        }
      />
      {avisos.creada && (
        <Aviso tipo="exito" className="mb-4">
          Lección creada. Ahora puedes añadirle ejercicios.
        </Aviso>
      )}
      {avisos.ejercicio === "creado" && (
        <Aviso tipo="exito" className="mb-4">
          Ejercicio creado.
        </Aviso>
      )}
      {avisos.ejercicio === "borrado" && (
        <Aviso tipo="exito" className="mb-4">
          Ejercicio borrado.
        </Aviso>
      )}

      <Caja
        titulo="Ejercicios"
        className="mb-6"
        sinRelleno
        acciones={
          <div className="flex gap-1.5">
            <BotonAdmin href={`${ruta}/ejercicios/nuevo?tipo=TEST`} variante="secundario" pequeno>
              <ListChecks aria-hidden="true" className="size-4" />
              Nuevo test
            </BotonAdmin>
            <BotonAdmin href={`${ruta}/ejercicios/nuevo?tipo=RETO`} variante="secundario" pequeno>
              <Puzzle aria-hidden="true" className="size-4" />
              Nuevo reto
            </BotonAdmin>
          </div>
        }
      >
        <ol className="divide-y divide-linea">
          {leccion.ejercicios.map((e, i) => (
            <li
              key={e.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <Insignia tono={e.tipo === "TEST" ? "acento" : "aviso"}>
                    {e.tipo === "TEST" ? "Test" : "Reto"}
                  </Insignia>
                  <Link
                    href={`${ruta}/ejercicios/${e.id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {e.enunciado}
                  </Link>
                </p>
                <p className="mt-0.5 text-xs text-gris">
                  {e.tipo === "TEST"
                    ? plural(listaDeTextos(e.opciones).length, "opción", "opciones")
                    : plural(listaDeTextos(e.pistas).length, "pista", "pistas")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <BotonesMover
                  accion={moverEjercicio}
                  datos={{ id: e.id, leccionId }}
                  primero={i === 0}
                  ultimo={i === leccion.ejercicios.length - 1}
                  nombre={e.enunciado}
                />
                <BotonAdmin href={`${ruta}/ejercicios/${e.id}`} variante="secundario" pequeno>
                  Editar
                </BotonAdmin>
                <BotonConfirmar
                  accion={borrarEjercicio}
                  datos={{ id: e.id, leccionId, cursoId: id }}
                  titulo="¿Borrar este ejercicio?"
                  texto="Se borrarán también las respuestas que hayan dado los alumnos. No se puede deshacer."
                  variante="suave"
                  pequeno
                >
                  Borrar
                </BotonConfirmar>
              </div>
            </li>
          ))}
          {leccion.ejercicios.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-gris">
              Esta lección no tiene ejercicios. Añade un test o un reto.
            </li>
          )}
        </ol>
      </Caja>

      <FormularioLeccion
        cursoId={id}
        leccion={leccion}
        servicios={proveedoresVideo.map(({ id: p, nombre, ejemplo }) => ({
          id: p,
          nombre,
          ejemplo,
        }))}
        videoInicial={analizarVideo(leccion.videoUrl)}
      />
    </>
  );
}
