import type { Metadata } from "next";
import { guardarArticuloEditor } from "@/app/editor/blog/acciones";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { FormularioArticulo } from "@/components/blog/FormularioArticulo";
import { db } from "@/lib/db";
import { exigirEditor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nuevo artículo" };

export default async function NuevoArticuloEditor() {
  await exigirEditor("/editor/blog/nuevo");
  const kits = await db.kit.findMany({
    where: { visible: true },
    orderBy: { orden: "asc" },
    select: { slug: true, nombre: true },
  });
  return (
    <>
      <Cabecera
        titulo="Nuevo artículo"
        volver={{ href: "/editor/blog", etiqueta: "Mis artículos" }}
      />
      <Caja>
        <FormularioArticulo
          accion={guardarArticuloEditor}
          kits={kits}
          textoBoton="Enviar a revisión"
        />
      </Caja>
    </>
  );
}
