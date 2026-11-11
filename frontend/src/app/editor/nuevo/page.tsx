import type { Metadata } from "next";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { FormularioGuion } from "@/components/contenido/FormularioGuion";
import { categoriasGuion, kitsParaGuion } from "@/lib/contenido/guiones";
import { exigirEditor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nueva idea de guion" };

/** Una idea propia: empieza como borrador que solo ves tú, hasta que la envías a revisión */
export default async function NuevaIdea() {
  await exigirEditor("/editor/nuevo");
  const [categorias, kits] = await Promise.all([categoriasGuion(true), kitsParaGuion()]);

  return (
    <>
      <Cabecera
        titulo="Nueva idea de guion"
        descripcion="Siempre sobre tecnología y robótica. Es un borrador que solo ves tú: cuando esté lista, envíala a revisión."
        volver={{ href: "/editor", etiqueta: "Mis guiones" }}
      />
      <Caja>
        <FormularioGuion categorias={categorias} kits={kits} idea />
      </Caja>
    </>
  );
}
