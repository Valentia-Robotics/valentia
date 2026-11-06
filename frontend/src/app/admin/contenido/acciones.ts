"use server";

/**
 * ACCIONES DEL PANEL: CONTENIDO (guiones y categorías)
 * Cada acción comprueba primero que quien la llama es ADMIN.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import type { EstadoGuion } from "@/generated/prisma/enums";
import { conErrores, texto, type EstadoFormulario } from "@/lib/admin/formularios";
import {
  actualizarGuion,
  asignarGuion,
  cambiarEstado,
  crearGuion,
  ErrorGuion,
} from "@/lib/contenido/guiones";
import { db } from "@/lib/db";
import { esId, idsValidos } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { esquemaCategoria, esquemaComentario, esquemaGuion } from "@/lib/validaciones/guion";

const NO_ENCONTRADO: EstadoFormulario = { ok: false, mensaje: "No encontramos ese guion." };

/** Los errores de las reglas se enseñan en el formulario; cualquier otro sigue su camino */
function mensajeDeError(error: unknown): EstadoFormulario {
  if (error instanceof ErrorGuion) return { ok: false, mensaje: error.message };
  throw error;
}

/** Crear (sin guionId) o editar (con guionId) un guion */
export async function guardarGuion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const admin = await exigirAdminEnAccion();
  const id = texto(formulario, "guionId");
  if (!idsValidos(id)) return NO_ENCONTRADO;

  const datos = esquemaGuion.safeParse({
    titulo: texto(formulario, "titulo"),
    categoriaId: texto(formulario, "categoriaId"),
    plataforma: texto(formulario, "plataforma"),
    plataformaOtra: texto(formulario, "plataformaOtra"),
    duracionObjetivo: texto(formulario, "duracionObjetivo"),
    gancho: texto(formulario, "gancho"),
    desarrollo: texto(formulario, "desarrollo"),
    llamadaAccion: texto(formulario, "llamadaAccion"),
    notasVisuales: texto(formulario, "notasVisuales"),
    kitId: texto(formulario, "kitId"),
    fechaLimite: texto(formulario, "fechaLimite"),
  });
  if (!datos.success) return conErrores(datos.error);
  const d = datos.data;

  // La categoría tiene que ser de la lista; una desactivada solo vale si el guion ya la tenía
  const actual = id
    ? await db.guion.findUnique({ where: { id }, select: { categoriaId: true } })
    : null;
  if (id && !actual) return NO_ENCONTRADO;
  const [categoria, kit] = await Promise.all([
    db.categoriaGuion.findUnique({ where: { id: d.categoriaId }, select: { activa: true } }),
    d.kitId ? db.kit.findUnique({ where: { id: d.kitId }, select: { id: true } }) : true,
  ]);
  if (!categoria || (!categoria.activa && actual?.categoriaId !== d.categoriaId)) {
    return {
      ok: false,
      mensaje: "Revisa los campos marcados en rojo.",
      errores: { categoriaId: "Elige una categoría de la lista." },
    };
  }
  if (!kit) {
    return {
      ok: false,
      mensaje: "Revisa los campos marcados en rojo.",
      errores: { kitId: "Ese kit ya no existe." },
    };
  }

  if (!id) {
    const guion = await crearGuion(d, admin);
    redirect(`/admin/contenido/${guion.id}`);
  }

  const guardado = await actualizarGuion(id, d);
  if (!guardado) {
    return { ok: false, mensaje: "Este guion ya no se puede editar: devuélvelo antes a borrador." };
  }
  revalidatePath(`/admin/contenido/${id}`);
  return { ok: true, mensaje: "Guion guardado." };
}

/** Los cambios de estado que hace el admin (asignar va aparte) */
const DESTINOS: EstadoGuion[] = [
  "BORRADOR",
  "PENDIENTE_APROBACION",
  "APROBADO",
  "COMPLETADO",
  "EN_PROGRESO",
];

export async function cambiarEstadoDeGuion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const admin = await exigirAdminEnAccion();
  const guionId = texto(formulario, "guionId");
  const a = texto(formulario, "a") as EstadoGuion;
  if (!esId(guionId) || !DESTINOS.includes(a)) return NO_ENCONTRADO;

  const comentario = esquemaComentario.safeParse(texto(formulario, "comentario"));
  if (!comentario.success) return conErrores(comentario.error);

  try {
    await cambiarEstado({
      guionId,
      a,
      actor: "ADMIN",
      autor: admin,
      comentario: comentario.data,
    });
  } catch (error) {
    return mensajeDeError(error);
  }
  revalidatePath("/admin/contenido", "layout");
  return { ok: true, mensaje: "Hecho." };
}

export async function asignarEditor(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const admin = await exigirAdminEnAccion();
  const guionId = texto(formulario, "guionId");
  const editorId = texto(formulario, "editorId");
  if (!esId(guionId)) return NO_ENCONTRADO;
  if (!esId(editorId)) {
    return {
      ok: false,
      mensaje: "Elige un editor.",
      errores: { editorId: "Elige un editor." },
    };
  }

  try {
    await asignarGuion(guionId, editorId, admin);
  } catch (error) {
    return mensajeDeError(error);
  }
  revalidatePath("/admin/contenido", "layout");
  return { ok: true, mensaje: "Guion asignado." };
}

/** Añadir una categoría a la lista */
export async function crearCategoria(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const nombre = esquemaCategoria.safeParse(texto(formulario, "nombre"));
  if (!nombre.success) {
    const mensaje = nombre.error.issues[0].message;
    return { ok: false, mensaje, errores: { nombre: mensaje } };
  }
  try {
    const orden = await db.categoriaGuion.count();
    await db.categoriaGuion.create({ data: { nombre: nombre.data, orden } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const mensaje = "Esa categoría ya existe.";
      return { ok: false, mensaje, errores: { nombre: mensaje } };
    }
    throw error;
  }
  revalidatePath("/admin/contenido", "layout");
  return { ok: true, mensaje: "Categoría añadida." };
}

/** Desactivar o reactivar una categoría (nunca se borra: los guiones antiguos la usan) */
export async function cambiarCategoria(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const categoriaId = texto(formulario, "categoriaId");
  if (!esId(categoriaId)) return { ok: false, mensaje: "No encontramos esa categoría." };
  await db.categoriaGuion.updateMany({
    where: { id: categoriaId },
    data: { activa: texto(formulario, "activa") === "si" },
  });
  revalidatePath("/admin/contenido", "layout");
  return { ok: true };
}
