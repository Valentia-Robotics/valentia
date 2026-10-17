/**
 * PEDIDOS (panel): lista con filtros y ficha de cada pedido.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { EstadoPedido } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { textoContiene } from "@/lib/busqueda";

export const PEDIDOS_POR_PAGINA = 25;

/** Lee el filtro de estado de la dirección (?estado=ENVIADO). "" = todos */
export function leerEstado(valor: unknown): EstadoPedido | "" {
  return typeof valor === "string" && valor in EstadoPedido ? (valor as EstadoPedido) : "";
}

/** Pedidos por estado y búsqueda (número, email o nombre), del más nuevo al más antiguo */
export async function buscarPedidos(busqueda: string, estado: EstadoPedido | "", pagina: number) {
  const q = busqueda.trim().slice(0, 100);
  const where: Prisma.PedidoWhereInput = {
    ...(estado ? { estado } : {}),
    ...(q
      ? {
          OR: [
            { numero: textoContiene(q.toUpperCase()) },
            { email: textoContiene(q.toLowerCase()) },
            { nombre: textoContiene(q) },
          ],
        }
      : {}),
  };

  const [total, pedidos, porEstado] = await Promise.all([
    db.pedido.count({ where }),
    db.pedido.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      skip: (pagina - 1) * PEDIDOS_POR_PAGINA,
      take: PEDIDOS_POR_PAGINA,
      select: {
        id: true,
        numero: true,
        nombre: true,
        email: true,
        ciudad: true,
        totalCentimos: true,
        estado: true,
        proveedorPago: true,
        creadoEn: true,
        _count: { select: { lineas: true } },
      },
    }),
    db.pedido.groupBy({ by: ["estado"], _count: { _all: true } }),
  ]);

  return {
    total,
    totalPaginas: Math.max(1, Math.ceil(total / PEDIDOS_POR_PAGINA)),
    pedidos,
    /** Cuántos pedidos hay en cada estado (para los filtros) */
    cuantos: Object.fromEntries(porEstado.map((g) => [g.estado, g._count._all])) as Partial<
      Record<EstadoPedido, number>
    >,
  };
}

/** Un pedido con todo lo necesario para su ficha en el panel */
export function obtenerPedidoAdmin(id: string) {
  return db.pedido.findUnique({
    where: { id },
    include: {
      lineas: true,
      usuario: { select: { id: true, nombre: true, email: true } },
      codigos: {
        orderBy: { creadoEn: "asc" },
        select: {
          id: true,
          codigo: true,
          usadoEn: true,
          desactivadoEn: true,
          kit: { select: { nombre: true } },
        },
      },
    },
  });
}
