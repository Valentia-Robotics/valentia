import type { Metadata } from "next";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { FormularioGuion } from "@/components/contenido/FormularioGuion";
import { categoriasGuion, kitsParaGuion } from "@/lib/contenido/guiones";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nuevo guion" };

/** Crear un guion: empieza en borrador */
export default async function NuevoGuion() {
  await exigirAdmin("/admin/contenido/nuevo");
  const [categorias, kits] = await Promise.all([categoriasGuion(true), kitsParaGuion()]);

  return (
    <>
      <Cabecera
        titulo="Nuevo guion"
        descripcion="Siempre sobre tecnología y robótica. Empieza como borrador."
        volver={{ href: "/admin/contenido", etiqueta: "Contenido" }}
      />
      <Caja>
        <FormularioGuion categorias={categorias} kits={kits} />
      </Caja>
    </>
  );
}
