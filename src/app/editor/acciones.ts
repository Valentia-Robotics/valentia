"use server";

/**
 * ACCIONES DEL PANEL DE EDITOR
 * Cada una comprueba que quien la llama es EDITOR, y las consultas solo encuentran SUS guiones.
 * El texto aprobado no se puede tocar desde aquí: solo su zona de trabajo, empezar y entregar.
 */
import { revalidatePath } from "next/cache";
import { texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { cambiarEstado, ErrorGuion, guardarNotasEditor } from "@/lib/contenido/guiones";
import { esId } from "@/lib/ids";
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

/** Guardar la zona de trabajo: sus notas o su versión adaptada */
export async function guardarNotas(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const editor = await exigirEditorEnAccion();
  const guionId = texto(formulario, "guionId");
  if (!esId(guionId)) return NO_ENCONTRADO;

  const notas = esquemaNotasEditor.safeParse(texto(formulario, "notasEditor"));
  if (!notas.success) return { ok: false, mensaje: notas.error.issues[0].message };

  const guardado = await guardarNotasEditor(guionId, editor.id, notas.data);
  if (!guardado) return { ok: false, mensaje: "Este guion ya no se puede cambiar." };
  revalidatePath(`/editor/${guionId}`);
  return { ok: true, mensaje: "Notas guardadas." };
}
