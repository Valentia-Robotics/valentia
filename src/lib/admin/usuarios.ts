/**
 * USUARIOS (panel): lista con buscador y filtro por estado (verificados / pendientes).
 * "Pendiente" = se registró pero no escribió el código del correo (ver src/lib/verificacion/pendientes.ts).
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { textoContiene } from "@/lib/busqueda";
import { db } from "@/lib/db";
import { USUARIO_VERIFICADO } from "@/lib/verificacion/pendientes";

export const USUARIOS_POR_PAGINA = 25;

export type EstadoUsuario = "verificados" | "pendientes";

/** Filtro de cada estado. Pendiente = sin verificar (también un ADMIN, si lo hubiera). */
const FILTRO_ESTADO: Record<EstadoUsuario, Prisma.UsuarioWhereInput> = {
  verificados: USUARIO_VERIFICADO,
  pendientes: { emailVerificadoEn: null },
};

/** Cuántas cuentas hay verificadas y pendientes */
export async function contarUsuarios() {
  const [verificados, pendientes] = await Promise.all([
    db.usuario.count({ where: FILTRO_ESTADO.verificados }),
    db.usuario.count({ where: FILTRO_ESTADO.pendientes }),
  ]);
  return { verificados, pendientes };
}

/** Usuarios que coinciden con la búsqueda (por email o nombre), del más nuevo al más antiguo */
export async function buscarUsuarios(busqueda: string, pagina: number, estado?: EstadoUsuario) {
  const q = busqueda.trim();
  const condiciones: Prisma.UsuarioWhereInput[] = [];
  if (q)
    condiciones.push({
      OR: [{ email: textoContiene(q.toLowerCase()) }, { nombre: textoContiene(q) }],
    });
  if (estado) condiciones.push(FILTRO_ESTADO[estado]);
  const where: Prisma.UsuarioWhereInput = { AND: condiciones };

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
        emailVerificadoEn: true,
        // Último código para confirmar el email (las pendientes enseñan cuándo se envió)
        verificaciones: {
          where: { motivo: "REGISTRO" },
          orderBy: { enviadoEn: "desc" },
          take: 1,
          select: { enviadoEn: true },
        },
        cursos: { select: { curso: { select: { id: true, titulo: true } } } },
      },
    }),
  ]);

  // Pedidos por el email del pedido (incluye los hechos como invitado con ese email)
  const pedidos = await db.pedido.groupBy({
    by: ["email"],
    where: { email: { in: filas.map((u) => u.email) } },
    _count: { _all: true },
  });
  const pedidosPorEmail = new Map(pedidos.map((p) => [p.email, p._count._all]));

  return {
    total,
    totalPaginas: Math.max(1, Math.ceil(total / USUARIOS_POR_PAGINA)),
    usuarios: filas.map(({ verificaciones, ...u }) => ({
      ...u,
      ultimoCodigoEn: verificaciones[0]?.enviadoEn ?? null,
      cursos: u.cursos.map((c) => c.curso),
      pedidos: pedidosPorEmail.get(u.email) ?? 0,
    })),
  };
}
