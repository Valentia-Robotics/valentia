/**
 * ESTADÍSTICAS DEL INICIO DEL PANEL
 * Todas las cifras salen de la base de datos en el momento de abrir la página.
 */
import "server-only";
import { db } from "@/lib/db";
import { PEDIDO_COBRADO } from "@/lib/pedidos";
import { limpiarPendientesCaducados, USUARIO_VERIFICADO } from "@/lib/verificacion/pendientes";
import { inicioDelMes } from "./formato";

/** Días que se tienen en cuenta para "cursos más activos" */
export const DIAS_ACTIVIDAD = 30;

export async function obtenerResumen() {
  const hace30Dias = new Date(Date.now() - DIAS_ACTIVIDAD * 24 * 3_600_000);
  // Antes de contar, fuera las cuentas que llevan más de una semana sin confirmar su email
  await limpiarPendientesCaducados();

  const [
    usuarios,
    usuariosMes,
    usuariosPendientes,
    pedidos,
    pedidosPagados,
    kitsVendidos,
    codigosGenerados,
    codigosActivados,
    actividad,
    ultimosPedidos,
    ultimosUsuarios,
  ] = await Promise.all([
    // Solo cuentan las cuentas con el email confirmado; las pendientes, aparte
    db.usuario.count({ where: USUARIO_VERIFICADO }),
    db.usuario.count({ where: { ...USUARIO_VERIFICADO, creadoEn: { gte: inicioDelMes() } } }),
    db.usuario.count({ where: { emailVerificadoEn: null } }),
    db.pedido.count(),
    db.pedido.count({ where: PEDIDO_COBRADO }),
    // Unidades de kit en pedidos pagados
    db.lineaPedido.aggregate({
      _sum: { cantidad: true },
      where: { tipo: "KIT", pedido: PEDIDO_COBRADO },
    }),
    db.codigoActivacion.count(),
    db.codigoActivacion.count({ where: { usadoEn: { not: null } } }),
    // Lecciones completadas en los últimos 30 días, con su curso
    db.progresoLeccion.findMany({
      where: { completadaEn: { gte: hace30Dias } },
      select: { usuarioId: true, leccion: { select: { cursoId: true } } },
    }),
    db.pedido.findMany({
      orderBy: { creadoEn: "desc" },
      take: 8,
      select: {
        id: true,
        numero: true,
        nombre: true,
        email: true,
        totalCentimos: true,
        estado: true,
        creadoEn: true,
      },
    }),
    db.usuario.findMany({
      where: USUARIO_VERIFICADO,
      orderBy: { creadoEn: "desc" },
      take: 8,
      select: { id: true, nombre: true, email: true, rol: true, creadoEn: true },
    }),
  ]);

  return {
    usuarios,
    usuariosMes,
    usuariosPendientes,
    pedidos,
    pedidosPagados,
    kitsVendidos: kitsVendidos._sum.cantidad ?? 0,
    codigosGenerados,
    codigosActivados,
    cursosActivos: await cursosMasActivos(actividad),
    ultimosPedidos,
    ultimosUsuarios,
  };
}

/** Agrupa la actividad por curso: lecciones completadas y alumnos distintos. Los 5 primeros. */
async function cursosMasActivos(actividad: { usuarioId: string; leccion: { cursoId: string } }[]) {
  const porCurso = new Map<string, { lecciones: number; alumnos: Set<string> }>();
  for (const { usuarioId, leccion } of actividad) {
    const datos = porCurso.get(leccion.cursoId) ?? { lecciones: 0, alumnos: new Set<string>() };
    datos.lecciones++;
    datos.alumnos.add(usuarioId);
    porCurso.set(leccion.cursoId, datos);
  }

  const cursos = await db.curso.findMany({
    select: { id: true, titulo: true, _count: { select: { alumnos: true } } },
  });
  return cursos
    .map((curso) => ({
      id: curso.id,
      titulo: curso.titulo,
      alumnosTotales: curso._count.alumnos,
      leccionesCompletadas: porCurso.get(curso.id)?.lecciones ?? 0,
      alumnosActivos: porCurso.get(curso.id)?.alumnos.size ?? 0,
    }))
    .sort(
      (a, b) =>
        b.leccionesCompletadas - a.leccionesCompletadas || b.alumnosTotales - a.alumnosTotales,
    )
    .slice(0, 5);
}
