/**
 * Lista de reseñas para el panel (/admin/resenas)
 */
import "server-only";
import type { EstadoResena } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export const RESENAS_POR_PAGINA = 25;

/** Reseñas (todas o de un estado), las más recientes primero, y cuántas hay de cada estado */
export async function buscarResenas(estado: EstadoResena | "", pagina: number) {
  const where = estado ? { estado } : {};
  const [resenas, total, grupos] = await Promise.all([
    db.resena.findMany({
      where,
      orderBy: { actualizadoEn: "desc" },
      skip: (pagina - 1) * RESENAS_POR_PAGINA,
      take: RESENAS_POR_PAGINA,
      select: {
        id: true,
        estrellas: true,
        texto: true,
        estado: true,
        actualizadoEn: true,
        kit: { select: { nombre: true, slug: true } },
        usuario: { select: { nombre: true, email: true } },
      },
    }),
    db.resena.count({ where }),
    db.resena.groupBy({ by: ["estado"], _count: { _all: true } }),
  ]);
  const cuantos: Partial<Record<EstadoResena, number>> = {};
  for (const g of grupos) cuantos[g.estado] = g._count._all;
  return {
    resenas,
    total,
    cuantos,
    totalPaginas: Math.max(1, Math.ceil(total / RESENAS_POR_PAGINA)),
  };
}
