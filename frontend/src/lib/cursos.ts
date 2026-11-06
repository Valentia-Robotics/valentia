/**
 * CURSOS DEL USUARIO
 * Consultas para "Mis cursos" y para las lecciones. Todas comprueban que el
 * usuario tiene el curso desbloqueado y solo devuelven lo que se puede enseñar:
 * la respuesta correcta de un test y la solución de un reto NO salen de aquí
 * hasta que el usuario responde o desbloquea la solución.
 */
import "server-only";
import { db } from "@/lib/db";
import { fuenteVideo } from "@/lib/video";

/** Lista de textos guardada como JSON (opciones de un test, pistas de un reto) */
function textos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
}

/** Cursos desbloqueados por el usuario, con su progreso */
export async function obtenerCursosDeUsuario(usuarioId: string) {
  const filas = await db.cursoUsuario.findMany({
    where: { usuarioId },
    orderBy: { desbloqueadoEn: "desc" },
    include: {
      curso: {
        include: {
          kit: { select: { nombre: true, imagen: true } },
          lecciones: {
            orderBy: { orden: "asc" },
            select: { slug: true, progreso: { where: { usuarioId }, select: { leccionId: true } } },
          },
        },
      },
    },
  });

  return filas.map(({ curso, desbloqueadoEn }) => {
    const completadas = curso.lecciones.filter((l) => l.progreso.length > 0).length;
    const siguiente = curso.lecciones.find((l) => l.progreso.length === 0) ?? curso.lecciones[0];
    return {
      slug: curso.slug,
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      nivel: curso.nivel,
      kit: curso.kit,
      desbloqueadoEn,
      totalLecciones: curso.lecciones.length,
      completadas,
      siguienteLeccion: siguiente?.slug ?? null,
    };
  });
}

export type CursoDeUsuario = Awaited<ReturnType<typeof obtenerCursosDeUsuario>>[number];

/** ¿Tiene el usuario este curso? (por el slug del curso) */
export async function cursoDesbloqueado(usuarioId: string, cursoSlug: string) {
  const fila = await db.cursoUsuario.findFirst({
    where: { usuarioId, curso: { slug: cursoSlug } },
    select: { cursoId: true },
  });
  return fila !== null;
}

/**
 * Datos del diploma de un curso: si lo ha terminado, cuándo (la última lección completada)
 * y cuántas lecciones le faltan si no. null si el usuario no tiene el curso.
 */
export async function obtenerDiploma(usuarioId: string, cursoSlug: string) {
  const fila = await db.cursoUsuario.findFirst({
    where: { usuarioId, curso: { slug: cursoSlug } },
    select: {
      curso: {
        select: {
          slug: true,
          titulo: true,
          kit: { select: { nombre: true } },
          lecciones: {
            select: { progreso: { where: { usuarioId }, select: { completadaEn: true } } },
          },
        },
      },
    },
  });
  if (!fila) return null;

  const { curso } = fila;
  const fechas = curso.lecciones.flatMap((l) => l.progreso.map((p) => p.completadaEn.getTime()));
  const completadas = curso.lecciones.filter((l) => l.progreso.length > 0).length;
  const faltan = curso.lecciones.length - completadas;
  return {
    slug: curso.slug,
    titulo: curso.titulo,
    kit: curso.kit?.nombre ?? null,
    lecciones: curso.lecciones.length,
    faltan,
    terminadoEn: faltan === 0 && fechas.length > 0 ? new Date(Math.max(...fechas)) : null,
  };
}

/** Primera lección sin completar de un curso (o la primera, si están todas hechas) */
export async function siguienteLeccion(usuarioId: string, cursoSlug: string) {
  const lecciones = await db.leccion.findMany({
    where: { curso: { slug: cursoSlug } },
    orderBy: { orden: "asc" },
    select: { slug: true, progreso: { where: { usuarioId }, select: { leccionId: true } } },
  });
  return (lecciones.find((l) => l.progreso.length === 0) ?? lecciones[0])?.slug ?? null;
}

/**
 * Todo lo necesario para pintar una lección: el curso con su temario (y qué está completado),
 * la lección, sus ejercicios (sin desvelar respuestas) y las lecciones anterior y siguiente.
 * Devuelve null si el curso o la lección no existen o el usuario no tiene el curso.
 */
export async function obtenerLeccion(usuarioId: string, cursoSlug: string, leccionSlug: string) {
  if (!(await cursoDesbloqueado(usuarioId, cursoSlug))) return null;

  const curso = await db.curso.findUnique({
    where: { slug: cursoSlug },
    select: {
      slug: true,
      titulo: true,
      lecciones: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          slug: true,
          orden: true,
          titulo: true,
          duracionMin: true,
          progreso: { where: { usuarioId }, select: { completadaEn: true } },
        },
      },
    },
  });
  if (!curso) return null;

  const posicion = curso.lecciones.findIndex((l) => l.slug === leccionSlug);
  if (posicion === -1) return null;

  const leccion = await db.leccion.findUniqueOrThrow({
    where: { id: curso.lecciones[posicion].id },
    select: {
      id: true,
      slug: true,
      orden: true,
      titulo: true,
      descripcion: true,
      videoUrl: true,
      duracionMin: true,
      // En la lección solo se enseñan los retos; el test va en su propia pantalla
      ejercicios: {
        where: { tipo: "RETO" },
        orderBy: { orden: "asc" },
        include: { progreso: { where: { usuarioId } } },
      },
      _count: { select: { ejercicios: { where: { tipo: "TEST" } } } },
      videosVistos: { where: { usuarioId }, select: { vistoEn: true } },
      resultadosTest: {
        where: { usuarioId },
        select: { aciertos: true, total: true, mejorAciertos: true, intentos: true },
      },
    },
  });

  const temario = curso.lecciones.map((l) => ({
    slug: l.slug,
    orden: l.orden,
    titulo: l.titulo,
    duracionMin: l.duracionMin,
    completada: l.progreso.length > 0,
  }));

  // Retos "seguros": la solución solo si ya la ha desbloqueado
  const ejercicios = leccion.ejercicios.map((e) => ({
    id: e.id,
    enunciado: e.enunciado,
    pistas: textos(e.pistas),
    solucion: e.progreso[0]?.solucionVista ? e.solucion : null,
  }));

  return {
    curso: { slug: curso.slug, titulo: curso.titulo },
    temario,
    leccion: {
      id: leccion.id,
      slug: leccion.slug,
      orden: leccion.orden,
      titulo: leccion.titulo,
      descripcion: leccion.descripcion,
      videoUrl: leccion.videoUrl,
      duracionMin: leccion.duracionMin,
      completada: temario[posicion].completada,
    },
    ejercicios,
    test: {
      preguntas: leccion._count.ejercicios,
      videoVisto: leccion.videosVistos.length > 0,
      resultado: leccion.resultadosTest[0] ?? null,
    },
    anterior: temario[posicion - 1] ?? null,
    siguiente: temario[posicion + 1] ?? null,
  };
}

export type DatosLeccion = NonNullable<Awaited<ReturnType<typeof obtenerLeccion>>>;
export type EjercicioSeguro = DatosLeccion["ejercicios"][number];

/** ¿Puede el usuario hacer el test? Sí si ha visto el vídeo o si la lección aún no tiene vídeo */
export function testDesbloqueado(videoUrl: string, videoVisto: boolean): boolean {
  return videoVisto || fuenteVideo(videoUrl).tipo === "pendiente";
}

/**
 * Pantalla del test de una lección: sus preguntas (SIN la respuesta correcta) y si está
 * desbloqueado. null si el usuario no tiene el curso o la lección no existe.
 */
export async function obtenerTestLeccion(
  usuarioId: string,
  cursoSlug: string,
  leccionSlug: string,
) {
  if (!(await cursoDesbloqueado(usuarioId, cursoSlug))) return null;
  const leccion = await db.leccion.findFirst({
    where: { slug: leccionSlug, curso: { slug: cursoSlug } },
    select: {
      id: true,
      slug: true,
      orden: true,
      titulo: true,
      videoUrl: true,
      curso: { select: { slug: true, titulo: true } },
      ejercicios: {
        where: { tipo: "TEST" },
        orderBy: { orden: "asc" },
        select: { id: true, enunciado: true, opciones: true },
      },
      videosVistos: { where: { usuarioId }, select: { vistoEn: true } },
    },
  });
  if (!leccion) return null;
  return {
    leccion: {
      id: leccion.id,
      slug: leccion.slug,
      orden: leccion.orden,
      titulo: leccion.titulo,
    },
    curso: leccion.curso,
    desbloqueado: testDesbloqueado(leccion.videoUrl, leccion.videosVistos.length > 0),
    preguntas: leccion.ejercicios.map((e) => ({
      id: e.id,
      enunciado: e.enunciado,
      opciones: textos(e.opciones),
    })),
  };
}

export type TestLeccion = NonNullable<Awaited<ReturnType<typeof obtenerTestLeccion>>>;

/** Comprueba que el usuario puede usar un ejercicio (tiene su curso) y lo devuelve completo */
export async function ejercicioDelUsuario(usuarioId: string, ejercicioId: string) {
  return db.ejercicio.findFirst({
    where: {
      id: ejercicioId,
      leccion: { curso: { alumnos: { some: { usuarioId } } } },
    },
    include: { leccion: { select: { slug: true, curso: { select: { slug: true } } } } },
  });
}

/** Comprueba que el usuario puede usar una lección (tiene su curso) */
export async function leccionDelUsuario(usuarioId: string, leccionId: string) {
  return db.leccion.findFirst({
    where: { id: leccionId, curso: { alumnos: { some: { usuarioId } } } },
    select: { id: true, slug: true, curso: { select: { slug: true } } },
  });
}
