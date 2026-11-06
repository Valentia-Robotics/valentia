import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cambiarVisibilidadComponente } from "@/app/admin/componentes/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonVisibilidad } from "@/components/admin/BotonVisibilidad";
import { Buscador } from "@/components/admin/Buscador";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { categorias, nombreCategoria } from "@/config/categorias";
import { listarComponentesAdmin } from "@/lib/admin/componentes";
import { exigirAdmin } from "@/lib/sesion";
import { cn, formatearPrecio, plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Componentes" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** COMPONENTES: lista con buscador y filtro por categoría */
export default async function ComponentesAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/componentes");
  const p = await searchParams;
  const q = typeof p.q === "string" ? p.q : "";
  const categoria = categorias.find((c) => c.id === p.categoria)?.id;
  const componentes = await listarComponentesAdmin(q, categoria);

  const enlaceCategoria = (id?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (id) params.set("categoria", id);
    const texto = params.toString();
    return `/admin/componentes${texto ? `?${texto}` : ""}`;
  };

  return (
    <>
      <Cabecera
        titulo="Componentes"
        descripcion={`${plural(componentes.length, "componente", "componentes")}${q || categoria ? " con estos filtros" : ""}. Los cambios se ven al momento en la tienda y en el configurador.`}
        acciones={
          <BotonAdmin href="/admin/componentes/nuevo">
            <Plus aria-hidden="true" className="size-4" />
            Nuevo componente
          </BotonAdmin>
        }
      />
      {p.borrado && (
        <Aviso tipo="exito" className="mb-4">
          Componente borrado.
        </Aviso>
      )}

      <div className="mb-4 space-y-3">
        <Buscador
          valor={q}
          placeholder="Buscar por nombre, dirección o tipo"
          etiqueta="Buscar componentes"
          extra={{ categoria }}
        />
        <nav aria-label="Filtrar por categoría" className="flex flex-wrap gap-1.5 text-[13px]">
          {[{ id: undefined, nombre: "Todas" }, ...categorias].map((c) => (
            <Link
              key={c.nombre}
              href={enlaceCategoria(c.id)}
              aria-current={categoria === c.id ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 ring-1",
                categoria === c.id
                  ? "bg-tinta text-white ring-tinta"
                  : "bg-white ring-linea hover:ring-tinta/40",
              )}
            >
              {c.nombre}
            </Link>
          ))}
        </nav>
      </div>

      <Caja sinRelleno>
        <Tabla
          columnas={["Componente", "Categoría", "Precio", "Stock", "Estado", ""]}
          vacia={componentes.length === 0 && "No hay componentes con estos filtros."}
        >
          {componentes.map((c) => (
            <tr key={c.id}>
              <td>
                <div className="flex items-center gap-3">
                  <Image
                    src={c.imagen}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="size-10 shrink-0 rounded bg-niebla object-contain p-0.5"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/admin/componentes/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.nombre}
                    </Link>
                    <p className="text-xs text-gris">
                      {c.tipo}
                      {c._count.enKits > 0 && ` · en ${plural(c._count.enKits, "kit", "kits")}`}
                    </p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap">{nombreCategoria(c.categoria)}</td>
              <td className="whitespace-nowrap tabular-nums">
                {formatearPrecio(c.precioCentimos)}
              </td>
              <td className={cn("tabular-nums", c.stock === 0 && "font-medium text-error")}>
                {c.stock === 0 ? "Agotado" : c.stock}
              </td>
              <td>
                {c.visible ? (
                  <Insignia tono="exito">Visible</Insignia>
                ) : (
                  <Insignia>Oculto</Insignia>
                )}
              </td>
              <td>
                <div className="flex justify-end gap-1">
                  <BotonVisibilidad
                    accion={cambiarVisibilidadComponente}
                    id={c.id}
                    visible={c.visible}
                  />
                  <BotonAdmin href={`/admin/componentes/${c.id}`} variante="secundario" pequeno>
                    Editar
                  </BotonAdmin>
                </div>
              </td>
            </tr>
          ))}
        </Tabla>
      </Caja>
    </>
  );
}
