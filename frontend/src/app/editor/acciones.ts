"use server";

/**
 * ACCIONES DEL PANEL DE EDITOR («Mis guiones»)
 * Cada una comprueba que quien la llama trabaja como editor (rol EDITOR o admin que también edita),
 * y las consultas solo encuentran SUS guiones: los que tiene asignados y sus ideas propias.
 * El texto de un guion asignado no se toca desde aquí: solo sus notas, sus pasos, empezar y entregar.
 * Sus ideas propias sí las escribe él, mientras son borrador.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { limpiarPasos } from "@/config/estadosGuion";
import type { EstadoGuion } from "@/generated/prisma/enums";
import { texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { leerFormularioGuion } from "@/lib/contenido/formularioGuion";
import {
  actualizarIdeaPropia,
  cambiarEstado,
  crearIdeaPropia,
  duplicarComoIdea,
  ErrorGuion,
  guardarNotasEditor,
  guardarPasosEditor,
} from "@/lib/contenido/guiones";
import { db } from "@/lib/db";
import { esId, idsValidos } from "@/lib/ids";
import { exigirEditorEnAccion } from "@/lib/sesion";
import { esquemaEnlaceVideo, esquemaNotasEditor } from "@/lib/validaciones/guion";

const NO_ENCONTRADO: EstadoFormulario = { ok: false, mensaje: "No encontramos ese guion." };

function mensajeDeError(error: unknown): EstadoFormulario {
  if (error instanceof ErrorGuion) return { ok: false, mensaje: error.message };
  throw error;
}

/** «Empezar»: pasa a en progreso */
export async function empezarGuion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const editor = await exigirEditorEnAccion();
  const guionId = texto(formulario, "guionId");
  if (!esId(guionId)) return NO_ENCONTRADO;
  try {
    await cambiarEstado({ guionId, a: "EN_PROGRESO", actor: "EDITOR", autor: editor });
  } catch (error) {
    return mensajeDeError(error);
  }
  revalidatePath("/editor", "layout");
  return { ok: true };
}

/** «Entregar»: pasa a entregado, con el enlace del vídeo terminado */
export async function entregarGuion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const editor = await exigirEditorEnAccion();
  const guionId = texto(formulario, "guionId");
  if (!esId(guionId)) return NO_ENCONTRADO;

  const enlace = esquemaEnlaceVideo.safeParse(texto(formulario, "enlaceVideo"));
  if (!enlace.success) {
    const mensaje = enlace.error.issues[0].message;
    return { ok: false, mensaje, errores: { enlaceVideo: mensaje } };
  }
  try {
    await cambiarEstado({
      guionId,
      a: "ENTREGADO",
      actor: "EDITOR",
      autor: editor,
      datos: { enlaceVideo: enlace.data },
    });
  } catch (error) {
    return mensajeDeError(error);
  }
  revalidatePath("/editor", "layout");
  return { ok: true, mensaje: "Entregado." };
}

/**
 * Guardar la zona de trabajo (sus notas o su versión adaptada). La llama el guardado automático
 * mientras escribe: no recarga la página.
 */
export async function guardarNotas(
  guionId: string,
  notas: string,
): Promise<{ ok: boolean; mensaje?: string }> {
  const editor = await exigirEditorEnAccion();
  if (!esId(guionId)) return { ok: false, mensaje: "No encontramos ese guion." };

  const valido = esquemaNotasEditor.safeParse(notas);
  if (!valido.success) return { ok: false, mensaje: valido.error.issues[0].message };

  const guardado = await guardarNotasEditor(guionId, editor.id, valido.data);
  if (!guardado) return { ok: false, mensaje: "Este guion ya no se puede cambiar." };
  return { ok: true };
}

/** Marcar o desmarcar pasos de edición (la lista de la derecha). Sin recargar la página. */
export async function guardarPasos(
  guionId: string,
  pasos: string[],
): Promise<{ ok: boolean; mensaje?: string }> {
  const editor = await exigirEditorEnAccion();
  if (!esId(guionId)) return { ok: false, mensaje: "No encontramos ese guion." };
  const lista = z.array(z.string().max(40)).max(50).safeParse(pasos);
  if (!lista.success) return { ok: false, mensaje: "Esos pasos no son válidos." };

  const guardado = await guardarPasosEditor(guionId, editor.id, limpiarPasos(lista.data));
  if (!guardado) return { ok: false, mensaje: "Este guion ya no se puede cambiar." };
  revalidatePath("/editor");
  return { ok: true };
}

/** Crear (sin guionId) o corregir (con guionId) una idea propia. Solo en borrador. */
export async function guardarIdea(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const editor = await exigirEditorEnAccion();
  const id = texto(formulario, "guionId");
  if (!idsValidos(id)) return NO_ENCONTRADO;

  const actual = id
    ? await db.guion.findFirst({
        where: { id, creadoPorId: editor.id, origen: "EDITOR", editorId: null },
        select: { categoriaId: true },
      })
    : null;
  if (id && !actual) return NO_ENCONTRADO;
  const leido = await leerFormularioGuion(formulario, actual?.categoriaId);
  if ("error" in leido) return leido.error;

  if (!id) {
    const guion = await crearIdeaPropia(leido.datos, editor);
    redirect(`/editor/${guion.id}`);
  }
  const guardado = await actualizarIdeaPropia(id, editor.id, leido.datos);
  if (!guardado) {
    return { ok: false, mensaje: "Ya no se puede cambiar: retírala de revisión para seguir." };
  }
  revalidatePath(`/editor/${id}`);
  return { ok: true, mensaje: "Idea guardada." };
}

/** Lo que el autor puede hacer con su idea: enviarla, retirarla, archivarla y recuperarla */
const MOVIMIENTOS_IDEA: EstadoGuion[] = ["PENDIENTE_APROBACION", "BORRADOR", "DESCARTADO"];

export async function moverIdea(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const editor = await exigirEditorEnAccion();
  const guionId = texto(formulario, "guionId");
  const a = texto(formulario, "a") as EstadoGuion;
  if (!esId(guionId)) return NO_ENCONTRADO;
  if (!MOVIMIENTOS_IDEA.includes(a)) return { ok: false, mensaje: "Ese cambio no existe." };
  try {
    await cambiarEstado({ guionId, a, actor: "AUTOR", autor: editor });
  } catch (error) {
    return mensajeDeError(error);
  }
  revalidatePath("/editor", "layout");
  revalidatePath("/admin/contenido");
  return { ok: true };
}

/** Hace una idea propia nueva copiando un guion suyo, y la abre */
export async function duplicarGuion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const editor = await exigirEditorEnAccion();
  const guionId = texto(formulario, "guionId");
  if (!esId(guionId)) return NO_ENCONTRADO;
  const copia = await duplicarComoIdea(guionId, editor);
  if (!copia) return NO_ENCONTRADO;
  redirect(`/editor/${copia.id}`);
}
