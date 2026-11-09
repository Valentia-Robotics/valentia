import type { Metadata } from "next";
import Link from "next/link";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { estadosArticulo } from "@/config/blog";
import { fechaHora } from "@/lib/admin/formato";
import { db } from "@/lib/db";
import { exigirEditor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis artículos" };

/** Los artículos que ha escrito este editor (solo los suyos) */
export default async function BlogEditor() {
  const editor = await exigirEditor("/editor/blog");
  const articulos = await db.articulo.findMany({
    where: { autorId: editor.id },
    orderBy: { actualizadoEn: "desc" },
    select: { id: true, titulo: true, estado: true, actualizadoEn: true, slug: true },
  });
  return (
    <>
      <Cabecera
        titulo="Mis artículos"
        descripcion="Escribe para el blog. El admin los revisa antes de publicarlos."
        acciones={<BotonAdmin href="/editor/blog/nuevo">Nuevo artículo</BotonAdmin>}
      />
      <Caja sinRelleno>
        <Tabla
          columnas={["Artículo", "Estado", "Última vez"]}
          vacia={articulos.length === 0 && "Todavía no has escrito ninguno."}
        >
          {articulos.map((a) => (
            <tr key={a.id}>
              <td>
                <Link
                  href={a.estado === "PUBLICADO" ? `/blog/${a.slug}` : `/editor/blog/${a.id}`}
                  className="font-medium hover:text-acento"
                >
                  {a.titulo}
                </Link>
              </td>
              <td>
                <Insignia tono={estadosArticulo[a.estado].tono}>
                  {estadosArticulo[a.estado].nombre}
                </Insignia>
              </td>
              <td className="whitespace-nowrap text-gris">{fechaHora(a.actualizadoEn)}</td>
            </tr>
          ))}
        </Tabla>
      </Caja>
    </>
  );
}
