import type { Metadata } from "next";
import Link from "next/link";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Tabla } from "@/components/admin/Tabla";
import { InsigniaEstadoGuion } from "@/components/contenido/TextoGuion";
import { fecha } from "@/lib/admin/formato";
import { guionesDelEditor } from "@/lib/contenido/guiones";
import { exigirEditor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis guiones" };

/** MIS GUIONES: solo los que tiene asignados quien ha iniciado sesión */
export default async function MisGuiones() {
  const editor = await exigirEditor("/editor");
  const guiones = await guionesDelEditor(editor.id);

  return (
    <>
      <Cabecera titulo="Mis guiones" descripcion="Los guiones que tienes asignados." />
      <Caja sinRelleno>
        <Tabla
          columnas={["Guion", "Categoría", "Estado", "Fecha límite"]}
          vacia={guiones.length === 0 && "Todavía no tienes guiones asignados."}
        >
          {guiones.map((g) => (
            <tr key={g.id}>
              <td>
                <Link href={`/editor/${g.id}`} className="font-medium hover:text-acento">
                  {g.titulo}
                </Link>
              </td>
              <td className="text-gris">{g.categoria.nombre}</td>
              <td>
                <InsigniaEstadoGuion estado={g.estado} />
              </td>
              <td className="whitespace-nowrap text-gris">{fecha(g.fechaLimite)}</td>
            </tr>
          ))}
        </Tabla>
      </Caja>
    </>
  );
}
