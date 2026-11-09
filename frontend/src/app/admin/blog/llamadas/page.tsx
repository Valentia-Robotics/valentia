import type { Metadata } from "next";
import Link from "next/link";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { fechaHora } from "@/lib/admin/formato";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Registro de n8n" };

const tono = (estado: number) =>
  estado >= 200 && estado < 300 ? "exito" : estado === 0 || estado >= 500 ? "error" : "aviso";

/** Cada llamada de n8n a la API del blog, y cada aviso de la web a n8n (se guardan 90 días) */
export default async function LlamadasBlog() {
  await exigirAdmin("/admin/blog/llamadas");
  const llamadas = await db.llamadaBlog.findMany({ orderBy: { fecha: "desc" }, take: 300 });
  return (
    <>
      <Cabecera
        titulo="Registro de n8n"
        descripcion="Las últimas 300 llamadas. Un 0 quiere decir que no se pudo conectar con n8n."
        volver={{ href: "/admin/blog", etiqueta: "Blog" }}
      />
      <Caja sinRelleno>
        <Tabla
          columnas={["Fecha", "Llamada", "Resultado", "Detalle"]}
          vacia={llamadas.length === 0 && "n8n todavía no ha llamado."}
        >
          {llamadas.map((l) => (
            <tr key={l.id} className="[&>td]:align-top">
              <td className="whitespace-nowrap text-gris">{fechaHora(l.fecha)}</td>
              <td className="font-mono text-xs whitespace-nowrap">{l.ruta}</td>
              <td>
                <Insignia tono={tono(l.estado)}>{l.estado}</Insignia>
              </td>
              <td className="text-sm break-words">
                {l.detalle}
                {l.articuloId && (
                  <>
                    {" "}
                    <Link href={`/admin/blog/${l.articuloId}`} className="text-acento underline">
                      Ver artículo
                    </Link>
                  </>
                )}
              </td>
            </tr>
          ))}
        </Tabla>
      </Caja>
    </>
  );
}
