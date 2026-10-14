import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cabecera } from "@/components/admin/Cabecera";
import { FormularioLeccion } from "@/components/admin/FormularioLeccion";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/sesion";
import { proveedoresVideo } from "@/lib/video";

export const metadata: Metadata = { title: "Nueva lección" };

interface Props {
  params: Promise<{ id: string }>;
}

/** CREAR UNA LECCIÓN (se añade al final del temario) */
export default async function NuevaLeccion({ params }: Props) {
  const { id } = await params;
  await exigirAdmin(`/admin/cursos/${id}/lecciones/nueva`);
  const curso = await db.curso.findUnique({ where: { id }, select: { id: true, titulo: true } });
  if (!curso) notFound();

  return (
    <>
      <Cabecera
        titulo="Nueva lección"
        descripcion="Se añade al final del temario. Después podrás moverla y añadirle ejercicios."
        volver={{ href: `/admin/cursos/${curso.id}`, etiqueta: curso.titulo }}
      />
      <FormularioLeccion
        cursoId={curso.id}
        servicios={proveedoresVideo.map(({ id, nombre, ejemplo }) => ({ id, nombre, ejemplo }))}
        videoInicial={{ proveedor: "", valor: "" }}
      />
    </>
  );
}
