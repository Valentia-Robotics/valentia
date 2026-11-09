import type { Metadata } from "next";
import Link from "next/link";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { FormularioAjustesBlog } from "@/components/blog/FormularioAjustesBlog";
import { categoriaPorSlug, estadosArticulo } from "@/config/blog";
import type { EstadoArticulo } from "@/generated/prisma/enums";
import { fechaHora } from "@/lib/admin/formato";
import { ajustesBlog } from "@/lib/blog/articulos";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/sesion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

const PESTANAS = Object.keys(estadosArticulo) as EstadoArticulo[];

/** BLOG: ajustes de la publicación automática y artículos por estado */
export default async function BlogAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/blog");
  const { estado: pedido } = await searchParams;
  const estado = PESTANAS.includes(pedido as EstadoArticulo) ? (pedido as EstadoArticulo) : "PENDIENTE";

  const [ajustes, articulos, cuentas] = await Promise.all([
    ajustesBlog(),
    db.articulo.findMany({
      where: { estado },
      orderBy: estado === "EN_COLA" ? { creadoEn: "asc" } : estado === "PUBLICADO" ? { publicadoEn: "desc" } : { creadoEn: "desc" },
      take: 200,
      select: {
        id: true,
        titulo: true,
        categoria: true,
        origen: true,
        autorNombre: true,
        motivos: true,
        creadoEn: true,
        publicadoEn: true,
        programadoPara: true,
        palabras: true,
      },
    }),
    db.articulo.groupBy({ by: ["estado"], _count: { _all: true } }),
  ]);
  const cuantos = (e: EstadoArticulo) => cuentas.find((c) => c.estado === e)?._count._all ?? 0;

  return (
    <>
      <Cabecera
        titulo="Blog"
        descripcion="Artículos de n8n y de los editores. Nada se publica sin pasar los filtros o tu aprobación."
        acciones={
          <div className="flex flex-wrap gap-2">
            <BotonAdmin href="/admin/blog/llamadas" variante="secundario">
              Registro de n8n
            </BotonAdmin>
            <BotonAdmin href="/blog" variante="secundario">
              Ver el blog
            </BotonAdmin>
            <BotonAdmin href="/admin/blog/nuevo">Nuevo artículo</BotonAdmin>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0">
          <nav aria-label="Estados" className="mb-4 flex flex-wrap gap-1 text-sm">
            {PESTANAS.map((e) => (
              <Link
                key={e}
                href={`/admin/blog?estado=${e}`}
                aria-current={e === estado ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5",
                  e === estado ? "bg-tinta text-white" : "text-tinta/80 hover:bg-white",
                )}
              >
                {estadosArticulo[e].plural} ({cuantos(e)})
              </Link>
            ))}
          </nav>
          <Caja sinRelleno>
            <Tabla
              columnas={["Artículo", "Categoría", "Autor", estado === "EN_COLA" ? "Saldrá" : "Fecha"]}
              vacia={articulos.length === 0 && "No hay ningún artículo aquí."}
            >
              {articulos.map((a) => (
                <tr key={a.id} className="[&>td]:align-top">
                  <td>
                    <Link href={`/admin/blog/${a.id}`} className="font-medium hover:text-acento">
                      {a.titulo}
                    </Link>
                    <span className="mt-0.5 block text-xs text-gris">{a.palabras} palabras</span>
                    {a.motivos.length > 0 && (
                      <ul className="mt-1 list-disc pl-4 text-xs text-aviso-oscuro">
                        {a.motivos.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="text-gris">{categoriaPorSlug(a.categoria)?.nombre ?? a.categoria}</td>
                  <td className="whitespace-nowrap">
                    {a.origen === "AUTO" ? (
                      <Insignia tono="acento">
                        <span aria-hidden="true">🤖&nbsp;</span>n8n
                      </Insignia>
                    ) : (
                      <span className="text-gris">{a.autorNombre}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-gris">
                    {estado === "EN_COLA"
                      ? a.programadoPara
                        ? fechaHora(a.programadoPara)
                        : "Cuando se encienda la publicación"
                      : fechaHora(a.publicadoEn ?? a.creadoEn)}
                  </td>
                </tr>
              ))}
            </Tabla>
          </Caja>
        </div>

        <Caja titulo="Publicación automática">
          <FormularioAjustesBlog
            ajustes={{ autoPublicar: ajustes.autoPublicar, porDia: ajustes.porDia, hora: ajustes.hora }}
          />
        </Caja>
      </div>
    </>
  );
}
