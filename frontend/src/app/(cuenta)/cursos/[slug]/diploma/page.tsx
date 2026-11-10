import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Diploma } from "@/components/cursos/Diploma";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { obtenerDiploma } from "@/lib/cursos";
import { exigirUsuario } from "@/lib/sesion";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Tu diploma", robots: { index: false } };

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

/** DIPLOMA: solo cuando se han completado todas las lecciones del curso */
export default async function PaginaDiploma({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const usuario = await exigirUsuario(`/cursos/${slug}/diploma`);
  const diploma = await obtenerDiploma(usuario.id, slug);
  if (!diploma) notFound();

  if (!diploma.terminadoEn) {
    return (
      <Contenedor className="py-16 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-medium sm:text-4xl">Aún no, pero queda poco.</h1>
          <p className="mt-4 text-gris">
            El diploma de <strong className="text-tinta">{diploma.titulo}</strong> se desbloquea al
            terminar todas las lecciones.{" "}
            {diploma.faltan === 1
              ? "Te falta una."
              : `Te faltan ${plural(diploma.faltan, "lección", "lecciones")}.`}
          </p>
          <div className="mt-8">
            <Boton href={`/cursos/${diploma.slug}`} variante="acento">
              Seguir con el curso
            </Boton>
          </div>
        </div>
      </Contenedor>
    );
  }

  return (
    <Contenedor className="py-10 sm:py-14 print:p-0">
      <header className="mb-8 print:hidden">
        <p className="etiqueta-taller">Curso terminado</p>
        <h1 className="mt-2 text-3xl font-medium sm:text-4xl">Tu diploma.</h1>
        <p className="mt-2 max-w-2xl text-gris">
          Lo has hecho entero, lección a lección. Aquí lo tienes para guardarlo o imprimirlo.
        </p>
      </header>
      <Diploma
        nombre={usuario.nombre}
        curso={diploma.titulo}
        kit={diploma.kit}
        lecciones={diploma.lecciones}
        fecha={formatoFecha.format(diploma.terminadoEn)}
      />
      <p className="mt-10 text-center text-sm print:hidden">
        <Boton href="/cursos" variante="enlace" className="h-auto text-sm underline">
          ‹ Volver a mis cursos
        </Boton>
      </p>
    </Contenedor>
  );
}
