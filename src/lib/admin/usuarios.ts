/**
 * USUARIOS (panel): lista con buscador.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const USUARIOS_POR_PAGINA = 25;

/** Usuarios que coinciden con la búsqueda (por email o nombre), del más nuevo al más antiguo */
export async function buscarUsuarios(busqueda: string, pagina: number) {
  const q = busqueda.trim();
  const where: Prisma.UsuarioWhereInput = q
    ? { OR: [{ email: { contains: q.toLowerCase() } }, { nombre: { contains: q } }] }
    : {};

  const [total, filas] = await Promise.all([
    db.usuario.count({ where }),
    db.usuario.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      skip: (pagina - 1) * USUARIOS_POR_PAGINA,
      take: USUARIOS_POR_PAGINA,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        creadoEn: true,
        cursos: { select: { curso: { select: { id: true, titulo: true } } } },
      },
    }),
  ]);

  // Los pedidos aún no van unidos a la cuenta: los buscamos por el email del pedido
  const pedidos = await db.pedido.groupBy({
    by: ["email"],
    where: { email: { in: filas.map((u) => u.email) } },
    _count: { _all: true },
  });
  const pedidosPorEmail = new Map(pedidos.map((p) => [p.email, p._count._all]));

  return {
    total,
    totalPaginas: Math.max(1, Math.ceil(total / USUARIOS_POR_PAGINA)),
    usuarios: filas.map((u) => ({
      ...u,
      cursos: u.cursos.map((c) => c.curso),
      pedidos: pedidosPorEmail.get(u.email) ?? 0,
    })),
  };
}
