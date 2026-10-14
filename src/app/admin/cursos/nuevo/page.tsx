import type { Metadata } from "next";
import { Cabecera } from "@/components/admin/Cabecera";
import { FormularioCurso } from "@/components/admin/FormularioCurso";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nuevo curso" };

/** CREAR UN CURSO. Las lecciones se añaden después, en la página del curso. */
export default async function NuevoCurso() {
  await exigirAdmin("/admin/cursos/nuevo");
  return (
    <>
      <Cabecera
        titulo="Nuevo curso"
        descripcion="Después de crearlo podrás añadir sus lecciones y asociarlo a un kit."
        volver={{ href: "/admin/cursos", etiqueta: "Cursos" }}
      />
      <FormularioCurso />
    </>
  );
}
