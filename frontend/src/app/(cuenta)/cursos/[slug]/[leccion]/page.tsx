import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, PartyPopper } from "lucide-react";
import { BotonCompletar } from "@/components/cursos/BotonCompletar";
import { EjercicioReto } from "@/components/cursos/EjercicioReto";
import { VideoYTest } from "@/components/cursos/VideoYTest";
import { TemarioLateral } from "@/components/cursos/TemarioLateral";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { obtenerLeccion } from "@/lib/cursos";
import { exigirUsuario } from "@/lib/sesion";

export const metadata: Metadata = { title: "Lección", robots: { index: false } };

interface Props {
  params: Promise<{ slug: string; leccion: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/**
 * LECCIÓN DE UN CURSO: temario a un lado; vídeo, acceso al test (se desbloquea al terminar
 * el vídeo), explicación, "Marcar como completada" y retos en el centro.
 */
export default async function PaginaLeccion({ params, searchParams }: Props) {
  const { slug, leccion: leccionSlug } = await params;
  const { activado } = await searchParams;
  const usuario = await exigirUsuario(`/cursos/${slug}/${leccionSlug}`);

  const datos = await obtenerLeccion(usuario.id, slug, leccionSlug);
  if (!datos) notFound();
  const { curso, temario, leccion, ejercicios, test, anterior, siguiente } = datos;

  return (
    <Contenedor className="py-8 sm:py-12">
      {activado === "1" && (
        <p
          role="status"
          className="mb-6 flex items-center gap-3 rounded-tarjeta bg-exito/8 p-4 text-exito"
        >
          <PartyPopper aria-hidden="true" className="size-6 shrink-0" />
          <span>
            <strong className="font-medium">¡Curso activado!</strong> Ya está guardado en «Mis
            cursos». ¡A por ello!
          </span>
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[19rem_1fr]">
        <aside className="lg:sticky lg:top-[calc(var(--spacing-nav)+1.5rem)] lg:self-start">
          <TemarioLateral
            cursoSlug={curso.slug}
            cursoTitulo={curso.titulo}
            temario={temario}
            actual={leccion.slug}
          />
        </aside>

        <article className="min-w-0">
          <p className="text-sm text-gris">
            Lección {leccion.orden} de {temario.length}
          </p>
          <h1 className="mt-1 text-3xl font-medium sm:text-4xl">{leccion.titulo}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-gris">
            <Clock aria-hidden="true" className="size-4" />
            {leccion.duracionMin} minutos
          </p>

          <div className="mt-6">
            <VideoYTest
              leccionId={leccion.id}
              urlTest={`/cursos/${curso.slug}/${leccion.slug}/test`}
              videoUrl={leccion.videoUrl}
              titulo={leccion.titulo}
              preguntas={test.preguntas}
              videoVisto={test.videoVisto}
              resultado={test.resultado}
            />
          </div>

          <p className="mt-6 text-lg leading-relaxed">{leccion.descripcion}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <BotonCompletar leccionId={leccion.id} completada={leccion.completada} />
          </div>

          {ejercicios.length > 0 && (
            <section aria-labelledby="titulo-ejercicios" className="mt-12">
              <h2 id="titulo-ejercicios" className="text-2xl font-medium">
                Manos a la obra
              </h2>
              <div className="mt-5 space-y-5">
                {ejercicios.map((e, i) => (
                  <EjercicioReto
                    key={e.id}
                    id={e.id}
                    numero={i + 1}
                    enunciado={e.enunciado}
                    pistas={e.pistas}
                    solucionInicial={e.solucion}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Navegación entre lecciones */}
          <nav
            aria-label="Otras lecciones"
            className="mt-12 flex flex-col gap-3 border-t border-linea pt-6 sm:flex-row sm:justify-between"
          >
            {anterior ? (
              <Boton
                href={`/cursos/${curso.slug}/${anterior.slug}`}
                variante="secundario"
                className="h-auto min-h-10 py-2 text-left whitespace-normal"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                {anterior.titulo}
              </Boton>
            ) : (
              <span />
            )}
            {siguiente ? (
              <Boton
                href={`/cursos/${curso.slug}/${siguiente.slug}`}
                variante="acento"
                className="h-auto min-h-10 py-2 text-left whitespace-normal"
              >
                Siguiente: {siguiente.titulo}
                <ChevronRight aria-hidden="true" className="size-4" />
              </Boton>
            ) : (
              <Boton href="/cursos" variante="acento">
                Volver a mis cursos
              </Boton>
            )}
          </nav>
        </article>
      </div>
    </Contenedor>
  );
}
