"use server";

/**
 * ACCIONES DEL PANEL: CURSOS, LECCIONES Y EJERCICIOS
 * Cada acción comprueba primero que quien la llama es ADMIN.
 */
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { conErrores, texto, textos, type EstadoFormulario } from "@/lib/admin/formularios";
import { refrescarTienda } from "@/lib/admin/refrescar";
import { db } from "@/lib/db";
import { exigirAdminEnAccion } from "@/lib/sesion";
import {
  crearSlug,
  esquemaCursoAdmin,
  esquemaLeccionAdmin,
  esquemaRetoAdmin,
  esquemaTestAdmin,
  slug as esquemaSlug,
} from "@/lib/validaciones/admin";
import { normalizarVideo } from "@/lib/video";

type Tx = Prisma.TransactionClient;

/** Comprueba el slug que se escribe al crear (o lo crea a partir del título) */
function leerSlug(formulario: FormData, titulo: string) {
  return esquemaSlug.safeParse(texto(formulario, "slug") || crearSlug(titulo));
}

/* ============================================================
 *  CURSOS
 * ============================================================ */

/** Crear (sin id) o editar (con id) un curso */
export async function guardarCurso(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "id");
  const datos = esquemaCursoAdmin.safeParse({
    titulo: texto(formulario, "titulo"),
    descripcion: texto(formulario, "descripcion"),
    nivel: texto(formulario, "nivel"),
  });
  if (!datos.success) return conErrores(datos.error);

  if (id) {
    const existe = await db.curso.findUnique({ where: { id }, select: { id: true } });
    if (!existe) return { ok: false, mensaje: "Este curso ya no existe." };
    await db.curso.update({ where: { id }, data: datos.data });
    refrescarTienda();
    return { ok: true, mensaje: "Cambios guardados." };
  }

  const slug = leerSlug(formulario, datos.data.titulo);
  if (!slug.success) {
    return {
      ok: false,
      mensaje: "Revisa la dirección.",
      errores: { slug: slug.error.issues[0].message },
    };
  }
  if (await db.curso.findUnique({ where: { slug: slug.data }, select: { id: true } })) {
    return {
      ok: false,
      mensaje: "Revisa la dirección.",
      errores: { slug: "Ya hay un curso con esta dirección." },
    };
  }
  const curso = await db.curso.create({ data: { ...datos.data, slug: slug.data } });
  redirect(`/admin/cursos/${curso.id}?creado=1`);
}

/**
 * Borrar un curso (con sus lecciones y ejercicios).
 * No se puede si va con un kit o si algún alumno lo tiene activado.
 */
export async function borrarCurso(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "id");
  const curso = await db.curso.findUnique({
    where: { id },
    select: { kit: { select: { nombre: true } }, _count: { select: { alumnos: true } } },
  });
  if (!curso) return { ok: false, mensaje: "Este curso ya no existe." };
  if (curso.kit) {
    return {
      ok: false,
      mensaje: `No se puede borrar porque es el curso del kit «${curso.kit.nombre}». Cambia antes el curso de ese kit.`,
    };
  }
  if (curso._count.alumnos > 0) {
    return {
      ok: false,
      mensaje: `No se puede borrar porque ${curso._count.alumnos === 1 ? "1 alumno lo tiene" : `${curso._count.alumnos} alumnos lo tienen`} activado y perderían su curso.`,
    };
  }
  await db.curso.delete({ where: { id } });
  refrescarTienda();
  redirect("/admin/cursos?borrado=1");
}

/* ============================================================
 *  LECCIONES
 * ============================================================ */

/** Crear (sin leccionId) o editar una lección, con su vídeo */
export async function guardarLeccion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const cursoId = texto(formulario, "cursoId");
  const leccionId = texto(formulario, "leccionId");

  const video = normalizarVideo(texto(formulario, "proveedorVideo"), texto(formulario, "video"));
  const errorVideo: Record<string, string> = video.ok ? {} : { video: video.error };
  const datos = esquemaLeccionAdmin.safeParse({
    titulo: texto(formulario, "titulo"),
    descripcion: texto(formulario, "descripcion"),
    duracionMin: texto(formulario, "duracionMin"),
  });
  if (!datos.success) return conErrores(datos.error, errorVideo);
  if (!video.ok) return { ok: false, mensaje: video.error, errores: errorVideo };
  const campos = { ...datos.data, videoUrl: video.url };

  const curso = await db.curso.findUnique({ where: { id: cursoId }, select: { id: true } });
  if (!curso) return { ok: false, mensaje: "Este curso ya no existe." };

  if (leccionId) {
    const actualizada = await db.leccion.updateMany({
      where: { id: leccionId, cursoId },
      data: campos,
    });
    if (actualizada.count === 0) return { ok: false, mensaje: "Esta lección ya no existe." };
    refrescarTienda();
    return { ok: true, mensaje: "Cambios guardados. Los alumnos ya ven la lección actualizada." };
  }

  const slug = leerSlug(formulario, datos.data.titulo);
  if (!slug.success) {
    return {
      ok: false,
      mensaje: "Revisa la dirección.",
      errores: { slug: slug.error.issues[0].message },
    };
  }
  if (await db.leccion.findUnique({ where: { cursoId_slug: { cursoId, slug: slug.data } } })) {
    return {
      ok: false,
      mensaje: "Revisa la dirección.",
      errores: { slug: "Ya hay una lección con esta dirección en este curso." },
    };
  }
  // La lección nueva va al final del curso
  const ultima = await db.leccion.aggregate({ where: { cursoId }, _max: { orden: true } });
  const leccion = await db.leccion.create({
    data: { ...campos, cursoId, slug: slug.data, orden: (ultima._max.orden ?? 0) + 1 },
  });
  refrescarTienda();
  redirect(`/admin/cursos/${cursoId}/lecciones/${leccion.id}?creada=1`);
}

/** Vuelve a numerar las lecciones de un curso 1, 2, 3… en el orden indicado */
async function renumerarLecciones(tx: Tx, ids: string[]) {
  for (const [i, id] of ids.entries()) {
    await tx.leccion.update({ where: { id }, data: { orden: i + 1 } });
  }
}

/** Subir o bajar una lección en el temario */
export async function moverLeccion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const cursoId = texto(formulario, "cursoId");
  const id = texto(formulario, "id");
  const paso = texto(formulario, "direccion") === "arriba" ? -1 : 1;

  await db.$transaction(async (tx) => {
    const lecciones = await tx.leccion.findMany({
      where: { cursoId },
      orderBy: { orden: "asc" },
      select: { id: true },
    });
    const ids = lecciones.map((l) => l.id);
    const i = ids.indexOf(id);
    const j = i + paso;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await renumerarLecciones(tx, ids);
  });
  refrescarTienda();
  return { ok: true };
}

/** Borrar una lección (con sus ejercicios y el progreso de los alumnos en ella) */
export async function borrarLeccion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const cursoId = texto(formulario, "cursoId");
  const id = texto(formulario, "id");

  const borrada = await db.$transaction(async (tx) => {
    const resultado = await tx.leccion.deleteMany({ where: { id, cursoId } });
    if (resultado.count === 0) return false;
    const resto = await tx.leccion.findMany({
      where: { cursoId },
      orderBy: { orden: "asc" },
      select: { id: true },
    });
    await renumerarLecciones(
      tx,
      resto.map((l) => l.id),
    );
    return true;
  });
  if (!borrada) return { ok: false, mensaje: "Esta lección ya no existe." };
  refrescarTienda();
  redirect(`/admin/cursos/${cursoId}?leccionBorrada=1`);
}

/* ============================================================
 *  EJERCICIOS
 * ============================================================ */

/** Crear (sin ejercicioId) o editar un ejercicio: un test o un reto */
export async function guardarEjercicio(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const cursoId = texto(formulario, "cursoId");
  const leccionId = texto(formulario, "leccionId");
  const ejercicioId = texto(formulario, "ejercicioId");
  const tipo = texto(formulario, "tipo") === "RETO" ? "RETO" : "TEST";

  // Un test guarda opciones, respuesta correcta y explicación; un reto, pistas y solución
  const datos =
    tipo === "TEST"
      ? esquemaTestAdmin.safeParse({
          enunciado: texto(formulario, "enunciado"),
          opciones: textos(formulario, "opcion"),
          correcta: texto(formulario, "correcta"),
          explicacion: texto(formulario, "explicacion"),
        })
      : esquemaRetoAdmin.safeParse({
          enunciado: texto(formulario, "enunciado"),
          pistas: textos(formulario, "pista"),
          solucion: texto(formulario, "solucion"),
        });
  if (!datos.success) return conErrores(datos.error);
  const campos = datos.data;

  const leccion = await db.leccion.findFirst({
    where: { id: leccionId, cursoId },
    select: { id: true },
  });
  if (!leccion) return { ok: false, mensaje: "Esta lección ya no existe." };
  const volver = `/admin/cursos/${cursoId}/lecciones/${leccionId}`;

  if (ejercicioId) {
    // El tipo de un ejercicio no cambia: si quieres otro tipo, crea uno nuevo
    const actualizado = await db.ejercicio.updateMany({
      where: { id: ejercicioId, leccionId, tipo },
      data: campos,
    });
    if (actualizado.count === 0) return { ok: false, mensaje: "Este ejercicio ya no existe." };
    refrescarTienda();
    return { ok: true, mensaje: "Ejercicio guardado." };
  }

  const ultimo = await db.ejercicio.aggregate({ where: { leccionId }, _max: { orden: true } });
  await db.ejercicio.create({
    data: {
      ...campos,
      tipo,
      leccionId,
      orden: (ultimo._max.orden ?? 0) + 1,
    },
  });
  refrescarTienda();
  redirect(`${volver}?ejercicio=creado`);
}

/** Subir o bajar un ejercicio dentro de su lección */
export async function moverEjercicio(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const leccionId = texto(formulario, "leccionId");
  const id = texto(formulario, "id");
  const paso = texto(formulario, "direccion") === "arriba" ? -1 : 1;

  await db.$transaction(async (tx) => {
    const ejercicios = await tx.ejercicio.findMany({
      where: { leccionId },
      orderBy: { orden: "asc" },
      select: { id: true },
    });
    const ids = ejercicios.map((e) => e.id);
    const i = ids.indexOf(id);
    const j = i + paso;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    for (const [n, ejercicio] of ids.entries()) {
      await tx.ejercicio.update({ where: { id: ejercicio }, data: { orden: n + 1 } });
    }
  });
  refrescarTienda();
  return { ok: true };
}

/** Borrar un ejercicio (y lo que han respondido los alumnos en él) */
export async function borrarEjercicio(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const cursoId = texto(formulario, "cursoId");
  const leccionId = texto(formulario, "leccionId");
  const id = texto(formulario, "id");
  const resultado = await db.ejercicio.deleteMany({ where: { id, leccionId } });
  if (resultado.count === 0) return { ok: false, mensaje: "Este ejercicio ya no existe." };
  refrescarTienda();
  redirect(`/admin/cursos/${cursoId}/lecciones/${leccionId}?ejercicio=borrado`);
}
