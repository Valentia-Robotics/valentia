/**
 * CURSOS (panel): consultas de cursos, lecciones, ejercicios y progreso de los alumnos.
 */
import "server-only";
import { db } from "@/lib/db";

/**
 * Progreso de los alumnos de un curso.
 *   medio      → de cada 100 lecciones que tienen que hacer entre todos, cuántas han completado
 *   terminados → alumnos que han completado todas las lecciones
 *   porLeccion → cuántos alumnos han completado cada lección
 * Solo cuentan los alumnos que tienen el curso activado.
 */
export async function progresoDeCurso(cursoId: string, totalLecciones: number) {
  const soloAlumnos = { leccion: { cursoId }, usuario: { cursos: { some: { cursoId } } } };
  const [alumnos, porUsuario, porLeccion] = await Promise.all([
    db.cursoUsuario.count({ where: { cursoId } }),
    db.progresoLeccion.groupBy({ by: ["usuarioId"], where: soloAlumnos, _count: { _all: true } }),
    db.progresoLeccion.groupBy({ by: ["leccionId"], where: soloAlumnos, _count: { _all: true } }),
  ]);
  const completadas = porUsuario.reduce((total, u) => total + u._count._all, 0);
  const posibles = alumnos * totalLecciones;
  return {
    alumnos,
    medio: posibles === 0 ? null : Math.round((completadas / posibles) * 100),
    terminados: porUsuario.filter((u) => totalLecciones > 0 && u._count._all >= totalLecciones)
      .length,
    porLeccion: new Map(porLeccion.map((l) => [l.leccionId, l._count._all])),
  };
}

/** Todos los cursos con su kit, sus lecciones y el progreso medio de sus alumnos */
export async function listarCursosAdmin() {
  const cursos = await db.curso.findMany({
    orderBy: { titulo: "asc" },
    select: {
      id: true,
      slug: true,
      titulo: true,
      nivel: true,
      kit: { select: { id: true, nombre: true } },
      _count: { select: { lecciones: true } },
    },
  });
  return Promise.all(
    cursos.map(async (curso) => ({
      ...curso,
      progreso: await progresoDeCurso(curso.id, curso._count.lecciones),
    })),
  );
}

export function obtenerCursoAdmin(id: string) {
  return db.curso.findUnique({
    where: { id },
    include: {
      kit: { select: { id: true, nombre: true } },
      lecciones: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          slug: true,
          orden: true,
          titulo: true,
          videoUrl: true,
          duracionMin: true,
          _count: { select: { ejercicios: true } },
        },
      },
    },
  });
}

export function obtenerLeccionAdmin(cursoId: string, leccionId: string) {
  return db.leccion.findFirst({
    where: { id: leccionId, cursoId },
    include: {
      curso: { select: { id: true, slug: true, titulo: true } },
      ejercicios: { orderBy: { orden: "asc" } },
      _count: { select: { progreso: true } },
    },
  });
}

export function obtenerEjercicioAdmin(leccionId: string, ejercicioId: string) {
  return db.ejercicio.findFirst({
    where: { id: ejercicioId, leccionId },
    include: {
      leccion: {
        select: { id: true, titulo: true, curso: { select: { id: true, titulo: true } } },
      },
    },
  });
}
