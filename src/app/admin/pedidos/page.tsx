import type { Metadata } from "next";
import Link from "next/link";
import { Buscador } from "@/components/admin/Buscador";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { EstadoPedido } from "@/components/admin/EstadoPedido";
import { Insignia } from "@/components/admin/Insignia";
import { leerPagina, Paginacion } from "@/components/admin/Paginacion";
import { Tabla } from "@/components/admin/Tabla";
import { estadosPedido } from "@/config/estadosPedido";
import { EstadoPedido as Estados } from "@/generated/prisma/enums";
import { fechaHora } from "@/lib/admin/formato";
import { buscarPedidos, leerEstado } from "@/lib/admin/pedidos";
import { exigirAdmin } from "@/lib/sesion";
import { cn, formatearPrecio, plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedidos" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** PEDIDOS: lista con filtro por estado y buscador por número, email o nombre */
export default async function PedidosAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/pedidos");
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q : "";
  const estado = leerEstado(parametros.estado);
  const pagina = leerPagina(parametros.pagina);
  const { pedidos, total, totalPaginas, cuantos } = await buscarPedidos(q, estado, pagina);

  const filtro = (valor: string) => {
    const p = new URLSearchParams();
    if (valor) p.set("estado", valor);
    if (q) p.set("q", q);
    const texto = p.toString();
    return `/admin/pedidos${texto ? `?${texto}` : ""}`;
  };

  return (
    <>
      <Cabecera
        titulo="Pedidos"
        descripcion={plural(total, "pedido", "pedidos") + (q ? ` para «${q}»` : "")}
      />

      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2 text-sm">
        {["", ...Object.keys(Estados)].map((valor) => {
          const activo = valor === estado;
          const numero = valor
            ? (cuantos[valor as keyof typeof cuantos] ?? 0)
            : Object.values(cuantos).reduce((t, n) => t + (n ?? 0), 0);
          return (
            <Link
              key={valor || "todos"}
              href={filtro(valor)}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 ring-1 transition-colors",
                activo ? "bg-tinta text-white ring-tinta" : "ring-linea hover:bg-niebla",
              )}
            >
              {valor ? estadosPedido[valor as keyof typeof estadosPedido].nombre : "Todos"}{" "}
              <span className="tabular-nums opacity-70">{numero}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mb-4">
        <Buscador
          valor={q}
          placeholder="Número, email o nombre"
          etiqueta="Buscar pedidos"
          extra={{ estado: estado || undefined }}
        />
      </div>

      <Caja sinRelleno>
        <Tabla
          columnas={["Pedido", "Cliente", "Fecha", "Total", "Estado"]}
          vacia={pedidos.length === 0 && "No hay pedidos con estos filtros."}
        >
          {pedidos.map((p) => (
            <tr key={p.id}>
              <td>
                <Link
                  href={`/admin/pedidos/${p.id}`}
                  className="font-mono font-medium text-acento hover:underline"
                >
                  {p.numero}
                </Link>
                <p className="text-xs text-gris">
                  {plural(p._count.lineas, "artículo", "artículos")}
                  {p.proveedorPago === "simulado" && (
                    <>
                      {" "}
                      · <Insignia tono="aviso">Prueba</Insignia>
                    </>
                  )}
                </p>
              </td>
              <td>
                <p>{p.nombre}</p>
                <p className="text-xs text-gris">
                  {p.email} · {p.ciudad}
                </p>
              </td>
              <td className="whitespace-nowrap text-gris">{fechaHora(p.creadoEn)}</td>
              <td className="tabular-nums">{formatearPrecio(p.totalCentimos)}</td>
              <td>
                <EstadoPedido estado={p.estado} />
              </td>
            </tr>
          ))}
        </Tabla>
        <Paginacion
          pagina={pagina}
          totalPaginas={totalPaginas}
          ruta="/admin/pedidos"
          filtros={{ q, estado }}
        />
      </Caja>
    </>
  );
}
