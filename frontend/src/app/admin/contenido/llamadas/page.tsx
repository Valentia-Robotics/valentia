import type { Metadata } from "next";
import Link from "next/link";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { fechaHora } from "@/lib/admin/formato";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Llamadas de n8n (guiones)" };

const tono = (estado: number) =>
  estado === 201 ? "exito" : estado === 409 ? "neutro" : estado >= 500 ? "error" : "aviso";

/**
 * REGISTRO DE GUIONES DE n8n: cada vez que n8n manda un guion, qué respondió la web.
 * Para saber si un guion llegó y, si no se creó, por qué (se guardan 90 días).
 */
export default async function LlamadasGuiones() {
  await exigirAdmin("/admin/contenido/llamadas");
  const llamadas = await db.llamadaGuion.findMany({ orderBy: { fecha: "desc" }, take: 300 });
  const creados = llamadas.filter((l) => l.estado === 201).length;

  return (
    <>
      <Cabecera
        titulo="Llamadas de n8n"
        descripcion={`Las últimas ${llamadas.length} veces que n8n ha mandado un guion (${creados} creados). Se guardan 90 días.`}
        volver={{ href: "/admin/contenido", etiqueta: "Contenido" }}
      />
      <Caja sinRelleno>
        <Tabla
          columnas={["Fecha", "Resultado", "Guion", "Detalle"]}
          vacia={
            llamadas.length === 0 &&
            "n8n todavía no ha mandado ningún guion desde que existe este registro."
          }
        >
          {llamadas.map((l) => (
            <tr key={l.id} className="[&>td]:align-top">
              <td className="whitespace-nowrap text-gris">{fechaHora(l.fecha)}</td>
              <td className="whitespace-nowrap">
                <Insignia tono={tono(l.estado)}>
                  {l.resultado} ({l.estado})
                </Insignia>
              </td>
              <td className="max-w-xs text-sm break-words">
                {l.guionId ? (
                  <Link
                    href={`/admin/contenido/${l.guionId}`}
                    className="font-medium hover:text-acento hover:underline"
                  >
                    {l.titulo || "Ver guion"}
                  </Link>
                ) : (
                  (l.titulo ?? <span className="text-gris">—</span>)
                )}
                {l.fuenteUrl && (
                  <span className="block truncate text-xs text-gris" title={l.fuenteUrl}>
                    {l.fuenteUrl}
                  </span>
                )}
              </td>
              <td className="text-sm break-words text-gris">{l.detalle}</td>
            </tr>
          ))}
        </Tabla>
      </Caja>
    </>
  );
}
