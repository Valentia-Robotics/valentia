import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cabecera } from "@/components/admin/Cabecera";
import { FormularioEjercicio } from "@/components/admin/FormularioEjercicio";
import { obtenerEjercicioAdmin } from "@/lib/admin/cursos";
import { listaDeTextos } from "@/lib/catalogo";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Editar ejercicio" };

interface Props {
  params: Promise<{ id: string; leccionId: string; ejercicioId: string }>;
}

/** EDITAR UN EJERCICIO (test o reto) */
export default async function EditarEjercicio({ params }: Props) {
  const { id, leccionId, ejercicioId } = await params;
  await exigirAdmin(`/admin/cursos/${id}/lecciones/${leccionId}/ejercicios/${ejercicioId}`);
  const ejercicio = await obtenerEjercicioAdmin(leccionId, ejercicioId);
  if (!ejercicio || ejercicio.leccion.curso.id !== id) notFound();

  return (
    <>
      <Cabecera
        titulo={ejercicio.tipo === "TEST" ? "Editar test" : "Editar reto"}
        volver={{
          href: `/admin/cursos/${id}/lecciones/${leccionId}`,
          etiqueta: ejercicio.leccion.titulo,
        }}
      />
      <FormularioEjercicio
        tipo={ejercicio.tipo}
        cursoId={id}
        leccionId={leccionId}
        ejercicio={{
          id: ejercicio.id,
          enunciado: ejercicio.enunciado,
          opciones: listaDeTextos(ejercicio.opciones),
          correcta: ejercicio.correcta,
          explicacion: ejercicio.explicacion,
          pistas: listaDeTextos(ejercicio.pistas),
          solucion: ejercicio.solucion,
        }}
      />
    </>
  );
}
