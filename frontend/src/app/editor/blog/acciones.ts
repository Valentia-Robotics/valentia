"use server";

/**
 * ACCIONES DEL EDITOR: SUS ARTÍCULOS DEL BLOG
 * Escribe y corrige los suyos; siempre vuelven a «Pendiente»: solo el admin publica.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { actualizarArticulo, crearArticulo, enviarARevision } from "@/lib/blog/articulos";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { exigirEditorEnAccion } from "@/lib/sesion";
import { ESTADOS_EDITABLES_EDITOR } from "@/config/blog";
import { leerArticulo } from "@/lib/validaciones/articulo";

export async function guardarArticuloEditor(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const editor = await exigirEditorEnAccion();
  const id = texto(formulario, "articuloId");
  if (id && !esId(id)) return { ok: false, mensaje: "No encontramos ese artículo." };
  const { datos, error } = leerArticulo(formulario);
  if (error) return error;

  if (!id) {
    const creado = await crearArticulo(datos, {
      origen: "MANUAL",
      autor: { id: editor.id, nombre: editor.nombre },
      siPasa: "PENDIENTE",
    });
    redirect(`/editor/blog/${creado.id}?creado=1`);
  }

  // Solo los suyos, y solo mientras no estén en cola ni publicados
  const suyo = await db.articulo.findFirst({
    where: { id, autorId: editor.id, estado: { in: [...ESTADOS_EDITABLES_EDITOR] } },
    select: { id: true },
  });
  if (!suyo) return { ok: false, mensaje: "Este artículo ya no se puede cambiar desde aquí." };
  const guardado = await actualizarArticulo(id, datos);
  if (!guardado) return { ok: false, mensaje: "No encontramos ese artículo." };
  await enviarARevision(id);
  revalidatePath("/editor/blog", "layout");
  return {
    ok: true,
    mensaje: guardado.motivos.length
      ? `Enviado a revisión. Para que salga antes, mejora esto: ${guardado.motivos.join(" ")}`
      : "Enviado a revisión.",
  };
}
