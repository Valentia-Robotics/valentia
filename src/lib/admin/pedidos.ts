/**
 * PEDIDOS (panel): lista con filtros y ficha de cada pedido.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { EstadoPedido } from "@/generated/prisma/enums";
import { fechaHora } from "@/lib/admin/formato";
import { db } from "@/lib/db";
import { textoContiene } from "@/lib/busqueda";

export const PEDIDOS_POR_PAGINA = 25;

/** Lee el filtro de estado de la dirección (?estado=ENVIADO). "" = todos */
export function leerEstado(valor: unknown): EstadoPedido | "" {
  return typeof valor === "string" && valor in EstadoPedido ? (valor as EstadoPedido) : "";
}

/** Pedidos por estado y búsqueda (número, email, nombre o apellidos), del más nuevo al más antiguo */
export async function buscarPedidos(busqueda: string, estado: EstadoPedido | "", pagina: number) {
  const q = busqueda.trim().slice(0, 100);
  const where: Prisma.PedidoWhereInput = {
    ...(estado ? { estado } : {}),
    // Cada palabra tiene que aparecer en el número, el email o el nombre: así «garcía ana»
    // encuentra a «Ana García» (el nombre y los apellidos se guardan juntos)
    ...(q
      ? {
          AND: q
            .split(/\s+/)
            .slice(0, 5)
            .map((palabra) => ({
              OR: [
                { numero: textoContiene(palabra.toUpperCase()) },
                { email: textoContiene(palabra.toLowerCase()) },
                { nombre: textoContiene(palabra) },
              ],
            })),
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

/** Pedidos pagados que aún no han salido (los más antiguos primero: son los más urgentes) */
export async function pedidosPorEnviar() {
  const pedidos = await db.pedido.findMany({
    where: { estado: { in: ["PAGADO", "PREPARANDO"] } },
    orderBy: { pagadoEn: "asc" },
    take: 200,
    select: {
      id: true,
      numero: true,
      nombre: true,
      codigoPostal: true,
      ciudad: true,
      estado: true,
      pagadoEn: true,
      creadoEn: true,
      email: true,
      lineas: { select: { nombre: true, cantidad: true } },
    },
  });
  return pedidos.map((p) => ({
    id: p.id,
    numero: p.numero,
    nombre: p.nombre,
    lugar: `${p.codigoPostal} ${p.ciudad}`,
    email: p.email,
    estado: p.estado,
    pagado: fechaHora(p.pagadoEn ?? p.creadoEn),
    articulos: p.lineas.map((l) => `${l.cantidad} × ${l.nombre}`),
  }));
}

export type PedidoPorEnviar = Awaited<ReturnType<typeof pedidosPorEnviar>>[number];
