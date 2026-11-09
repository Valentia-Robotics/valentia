import type { Metadata } from "next";
import { guardarArticuloAdmin } from "@/app/admin/blog/acciones";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { FormularioArticulo } from "@/components/blog/FormularioArticulo";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nuevo artículo" };

export default async function NuevoArticuloAdmin() {
  await exigirAdmin("/admin/blog/nuevo");
  const kits = await db.kit.findMany({
    orderBy: { orden: "asc" },
    select: { slug: true, nombre: true },
  });
  return (
    <>
      <Cabecera titulo="Nuevo artículo" volver={{ href: "/admin/blog", etiqueta: "Blog" }} />
      <Caja>
        <FormularioArticulo accion={guardarArticuloAdmin} kits={kits} textoBoton="Crear artículo" />
      </Caja>
    </>
  );
}
