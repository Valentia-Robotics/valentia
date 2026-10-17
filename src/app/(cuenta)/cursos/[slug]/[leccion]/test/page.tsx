import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { TestLeccion } from "@/components/cursos/TestLeccion";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { obtenerLeccion, obtenerTestLeccion } from "@/lib/cursos";
import { exigirUsuario } from "@/lib/sesion";

export const metadata: Metadata = { title: "Test de la lección", robots: { index: false } };

interface Props {
  params: Promise<{ slug: string; leccion: string }>;
}

/**
 * TEST DE UNA LECCIÓN (pantalla propia): las preguntas, una a una.
 * Solo se puede hacer después de ver el vídeo (se comprueba aquí y otra vez al corregir).
 */
export default async function PaginaTest({ params }: Props) {
  const { slug, leccion: leccionSlug } = await params;
  const usuario = await exigirUsuario(`/cursos/${slug}/${leccionSlug}/test`);

  const datos = await obtenerTestLeccion(usuario.id, slug, leccionSlug);
  if (!datos || datos.preguntas.length === 0) notFound();
  const urlLeccion = `/cursos/${slug}/${leccionSlug}`;

  // Para el botón "Siguiente lección" del resultado
  const leccion = await obtenerLeccion(usuario.id, slug, leccionSlug);
  const siguiente = leccion?.siguiente
    ? { titulo: leccion.siguiente.titulo, url: `/cursos/${slug}/${leccion.siguiente.slug}` }
    : null;

  return (
    <Contenedor className="max-w-3xl py-8 sm:py-12">
      <Boton href={urlLeccion} variante="enlace" className="h-auto text-sm">
        <ChevronLeft aria-hidden="true" className="size-4" />
        Volver a la lección
      </Boton>
      <p className="mt-6 text-sm text-gris">
        {datos.curso.titulo} · Lección {datos.leccion.orden}
      </p>
      <h1 className="mt-1 text-3xl font-medium sm:text-4xl">Test: {datos.leccion.titulo}</h1>

      {datos.desbloqueado ? (
        <TestLeccion
          leccionId={datos.leccion.id}
          preguntas={datos.preguntas}
          urlVideo={`${urlLeccion}#video`}
          siguiente={siguiente}
        />
      ) : (
        <section className="mt-10 rounded-tarjeta bg-niebla p-8 text-center">
          <Lock aria-hidden="true" className="mx-auto size-10 text-gris" strokeWidth={1.5} />
          <h2 className="mt-4 text-2xl font-medium">Primero, el vídeo</h2>
          <p className="mx-auto mt-2 max-w-md text-gris">
            El test se desbloquea cuando terminas de ver el vídeo de la lección. ¡Así lo tendrás
            todo fresco!
          </p>
          <Boton href={`${urlLeccion}#video`} variante="acento" tamano="lg" className="mt-6">
            Ver el vídeo
          </Boton>
        </section>
      )}
    </Contenedor>
  );
}
