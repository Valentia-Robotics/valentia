/**
 * USUARIOS (panel): lista con buscador.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { textoContiene } from "@/lib/busqueda";
import { ROLES_EQUIPO } from "@/config/equipo";
import { ultimaConexion, ultimoDispositivo } from "@/lib/admin/equipo";
import { db } from "@/lib/db";

export const USUARIOS_POR_PAGINA = 25;

const datosUsuario = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  creadoEn: true,
  ultimaConexionEn: true,
  dispositivos: ultimoDispositivo,
  cursos: { select: { curso: { select: { id: true, titulo: true } } } },
} as const;

/**
 * Usuarios que coinciden con la búsqueda (por email o nombre). Los empleados (roles de
 * src/config/equipo.ts) salen todos arriba en la primera página; debajo, los clientes del más
 * nuevo al más antiguo, por páginas.
 */
export async function buscarUsuarios(busqueda: string, pagina: number) {
  const q = busqueda.trim();
  const busca: Prisma.UsuarioWhereInput = q
    ? { OR: [{ email: textoContiene(q.toLowerCase()) }, { nombre: textoContiene(q) }] }
    : {};
  const rolesEquipo = ROLES_EQUIPO.map((r) => r.rol);
  const deClientes: Prisma.UsuarioWhereInput = { ...busca, rol: { notIn: rolesEquipo } };

  // Los empleados son pocos: se piden siempre todos (para contarlos) y se enseñan en la página 1
  const [todosEmpleados, totalClientes, clientes] = await Promise.all([
    db.usuario.findMany({
      where: { ...busca, rol: { in: rolesEquipo } },
      orderBy: { nombre: "asc" },
      select: datosUsuario,
    }),
    db.usuario.count({ where: deClientes }),
    db.usuario.findMany({
      where: deClientes,
      orderBy: { creadoEn: "desc" },
      skip: (pagina - 1) * USUARIOS_POR_PAGINA,
      take: USUARIOS_POR_PAGINA,
      select: datosUsuario,
    }),
  ]);
  // Por rol, en el orden de ROLES_EQUIPO (Administración, Editores…)
  todosEmpleados.sort((x, y) => rolesEquipo.indexOf(x.rol) - rolesEquipo.indexOf(y.rol));
  const totalEmpleados = todosEmpleados.length;
  const empleados = pagina === 1 ? todosEmpleados : [];
  const total = totalEmpleados + totalClientes;
  const filas = [...empleados, ...clientes];

  // Pedidos por el email del pedido (incluye los hechos como invitado con ese email)
  const pedidos = await db.pedido.groupBy({
    by: ["email"],
    where: { email: { in: filas.map((u) => u.email) } },
    _count: { _all: true },
  });
  const pedidosPorEmail = new Map(pedidos.map((p) => [p.email, p._count._all]));

  return {
    total,
    totalEmpleados,
    totalPaginas: Math.max(1, Math.ceil(totalClientes / USUARIOS_POR_PAGINA)),
    usuarios: filas.map(({ dispositivos, ...u }) => ({
      ...u,
      ultimaConexion: ultimaConexion(u.ultimaConexionEn, dispositivos),
      cursos: u.cursos.map((c) => c.curso),
      pedidos: pedidosPorEmail.get(u.email) ?? 0,
    })),
  };
}
