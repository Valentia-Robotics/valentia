import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cabecera } from "@/components/admin/Cabecera";
import { FormularioEjercicio } from "@/components/admin/FormularioEjercicio";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nuevo ejercicio" };

interface Props {
  params: Promise<{ id: string; leccionId: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** CREAR UN EJERCICIO: ?tipo=TEST (opción múltiple) o ?tipo=RETO (con pistas y solución) */
export default async function NuevoEjercicio({ params, searchParams }: Props) {
  const { id, leccionId } = await params;
  await exigirAdmin(`/admin/cursos/${id}/lecciones/${leccionId}`);
  const tipo = (await searchParams).tipo === "RETO" ? "RETO" : "TEST";
  const leccion = await db.leccion.findFirst({
    where: { id: leccionId, cursoId: id },
    select: { titulo: true },
  });
  if (!leccion) notFound();

  return (
    <>
      <Cabecera
        titulo={tipo === "TEST" ? "Nuevo test" : "Nuevo reto"}
        descripcion={
          tipo === "TEST"
            ? "Una pregunta con varias respuestas. Se corrige en el servidor: el alumno nunca ve la correcta antes de responder."
            : "Un desafío práctico con pistas que se desbloquean poco a poco y una solución final."
        }
        volver={{ href: `/admin/cursos/${id}/lecciones/${leccionId}`, etiqueta: leccion.titulo }}
      />
      <FormularioEjercicio tipo={tipo} cursoId={id} leccionId={leccionId} />
    </>
  );
}
