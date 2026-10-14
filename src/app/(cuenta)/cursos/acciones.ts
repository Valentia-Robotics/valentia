"use server";

/**
 * ACCIONES DE LOS CURSOS (se ejecutan en el servidor)
 * Cada una comprueba que hay sesión y que el usuario tiene el curso.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ejercicioDelUsuario, leccionDelUsuario } from "@/lib/cursos";
import { db } from "@/lib/db";
import { obtenerUsuario } from "@/lib/sesion";

const id = z.string().min(1).max(40);

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

export type ResultadoTest =
  { ok: true; acertado: boolean; correcta: number; explicacion: string | null } | { ok: false };

/** Corrige un test en el servidor (la respuesta correcta nunca está en el navegador antes) */
export async function responderTest(ejercicioId: string, opcion: number): Promise<ResultadoTest> {
  const usuario = await obtenerUsuario();
  if (!usuario || !id.safeParse(ejercicioId).success || !Number.isInteger(opcion)) {
    return { ok: false };
  }

  const ejercicio = await ejercicioDelUsuario(usuario.id, ejercicioId);
  if (!ejercicio || ejercicio.tipo !== "TEST" || ejercicio.correcta == null) return { ok: false };

  const acertado = opcion === ejercicio.correcta;
  await db.progresoEjercicio.upsert({
    where: { usuarioId_ejercicioId: { usuarioId: usuario.id, ejercicioId } },
    create: { usuarioId: usuario.id, ejercicioId, respuesta: opcion, acertado, intentos: 1 },
    update: { respuesta: opcion, acertado, intentos: { increment: 1 } },
  });

  return { ok: true, acertado, correcta: ejercicio.correcta, explicacion: ejercicio.explicacion };
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
