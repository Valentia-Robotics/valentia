"use server";

/**
 * ACCIONES DE LOS CURSOS (se ejecutan en el servidor)
 * Cada una comprueba que hay sesión y que el usuario tiene el curso.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ejercicioDelUsuario, leccionDelUsuario, testDesbloqueado } from "@/lib/cursos";
import { db, transaccion } from "@/lib/db";
import { obtenerUsuario } from "@/lib/sesion";
import { esquemaId } from "@/lib/ids";

/** Id de una lección o de un ejercicio (ObjectId de MongoDB) */
const id = esquemaId;

/** Marca (o desmarca) una lección como completada */
export async function marcarLeccion(leccionId: string, completada: boolean) {
  const usuario = await obtenerUsuario();
  if (!usuario || !id.safeParse(leccionId).success) return { ok: false };

  const leccion = await leccionDelUsuario(usuario.id, leccionId);
  if (!leccion) return { ok: false };

  const clave = { usuarioId_leccionId: { usuarioId: usuario.id, leccionId } };
  if (completada) {
    await db.progresoLeccion.upsert({
      where: clave,
      create: { usuarioId: usuario.id, leccionId },
      update: {},
    });
  } else {
    await db.progresoLeccion.deleteMany({ where: { usuarioId: usuario.id, leccionId } });
  }

  // Vuelve a pintar las páginas que enseñan el progreso
  revalidatePath("/cursos");
  revalidatePath(`/cursos/${leccion.curso.slug}`, "layout");
  return { ok: true };
}

/** Apunta que el usuario ha visto el vídeo de la lección hasta el final (desbloquea el test) */
export async function marcarVideoVisto(leccionId: string) {
  const usuario = await obtenerUsuario();
  if (!usuario || !id.safeParse(leccionId).success) return { ok: false };

  const leccion = await leccionDelUsuario(usuario.id, leccionId);
  if (!leccion) return { ok: false };

  await db.videoVisto.upsert({
    where: { usuarioId_leccionId: { usuarioId: usuario.id, leccionId } },
    create: { usuarioId: usuario.id, leccionId },
    update: {},
  });
  revalidatePath(`/cursos/${leccion.curso.slug}/${leccion.slug}`);
  return { ok: true };
}

/** Un test se aprueba acertando al menos la mitad de las preguntas */
const APROBADO = 0.5;

const esquemaTest = z.object({
  leccionId: id,
  respuestas: z.array(z.number().int().min(0).max(20)).min(1).max(50),
});

export type CorreccionTest =
  | {
      ok: true;
      aciertos: number;
      total: number;
      mejorAciertos: number;
      aprobado: boolean;
      /** En el mismo orden que las preguntas */
      correcciones: { correcta: number; explicacion: string | null }[];
    }
  | { ok: false; mensaje: string };

/**
 * Corrige el test completo de una lección EN EL SERVIDOR (las respuestas correctas nunca
 * llegan al navegador antes de esto), guarda el resultado y, si aprueba, marca la lección.
 */
export async function corregirTest(
  leccionId: string,
  respuestas: number[],
): Promise<CorreccionTest> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, mensaje: "Tu sesión ha caducado. Vuelve a iniciar sesión." };
  const datos = esquemaTest.safeParse({ leccionId, respuestas });
  if (!datos.success) return { ok: false, mensaje: "Las respuestas no son válidas." };

  const leccion = await db.leccion.findFirst({
    where: { id: leccionId, curso: { alumnos: { some: { usuarioId: usuario.id } } } },
    select: {
      slug: true,
      videoUrl: true,
      curso: { select: { slug: true } },
      videosVistos: { where: { usuarioId: usuario.id }, select: { vistoEn: true } },
      ejercicios: {
        where: { tipo: "TEST" },
        orderBy: { orden: "asc" },
        select: { id: true, correcta: true, explicacion: true },
      },
    },
  });
  if (!leccion) return { ok: false, mensaje: "No encontramos esta lección." };
  if (!testDesbloqueado(leccion.videoUrl, leccion.videosVistos.length > 0)) {
    return { ok: false, mensaje: "Termina primero el vídeo para desbloquear el test." };
  }
  const preguntas = leccion.ejercicios;
  if (preguntas.length !== datos.data.respuestas.length) {
    return { ok: false, mensaje: "El test ha cambiado. Recarga la página y vuelve a empezar." };
  }

  const aciertos = preguntas.filter((p, i) => p.correcta === datos.data.respuestas[i]).length;
  const total = preguntas.length;
  const aprobado = aciertos >= Math.ceil(total * APROBADO);

  const mejorAciertos = await transaccion(async (tx) => {
    for (const [i, pregunta] of preguntas.entries()) {
      const respuesta = datos.data.respuestas[i];
      const acertado = pregunta.correcta === respuesta;
      await tx.progresoEjercicio.upsert({
        where: { usuarioId_ejercicioId: { usuarioId: usuario.id, ejercicioId: pregunta.id } },
        create: {
          usuarioId: usuario.id,
          ejercicioId: pregunta.id,
          respuesta,
          acertado,
          intentos: 1,
        },
        update: { respuesta, acertado, intentos: { increment: 1 } },
      });
    }
    const clave = { usuarioId_leccionId: { usuarioId: usuario.id, leccionId } };
    const anterior = await tx.resultadoTest.findUnique({ where: clave });
    const mejor = Math.max(anterior?.mejorAciertos ?? 0, aciertos);
    await tx.resultadoTest.upsert({
      where: clave,
      create: { usuarioId: usuario.id, leccionId, aciertos, total, mejorAciertos: mejor },
      update: { aciertos, total, mejorAciertos: mejor, intentos: { increment: 1 } },
    });
    // Aprobar el test cuenta como completar la lección
    if (aprobado) {
      await tx.progresoLeccion.upsert({
        where: clave,
        create: { usuarioId: usuario.id, leccionId },
        update: {},
      });
    }
    return mejor;
  });

  revalidatePath("/cursos");
  revalidatePath(`/cursos/${leccion.curso.slug}`, "layout");
  return {
    ok: true,
    aciertos,
    total,
    mejorAciertos,
    aprobado,
    correcciones: preguntas.map((p) => ({
      correcta: p.correcta ?? -1,
      explicacion: p.explicacion,
    })),
  };
}

export type ResultadoSolucion = { ok: true; solucion: string } | { ok: false };

/** Desbloquea la solución de un reto (y lo recuerda para la próxima vez) */
export async function verSolucion(ejercicioId: string): Promise<ResultadoSolucion> {
  const usuario = await obtenerUsuario();
  if (!usuario || !id.safeParse(ejercicioId).success) return { ok: false };

  const ejercicio = await ejercicioDelUsuario(usuario.id, ejercicioId);
  if (!ejercicio || ejercicio.tipo !== "RETO" || !ejercicio.solucion) return { ok: false };

  await db.progresoEjercicio.upsert({
    where: { usuarioId_ejercicioId: { usuarioId: usuario.id, ejercicioId } },
    create: { usuarioId: usuario.id, ejercicioId, solucionVista: true },
    update: { solucionVista: true },
  });

  return { ok: true, solucion: ejercicio.solucion };
}
