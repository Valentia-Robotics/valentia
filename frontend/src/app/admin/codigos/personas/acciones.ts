"use server";

/**
 * ACCIONES DEL PANEL: PERSONAS REGISTRADAS CON TARJETA DE BIENVENIDA
 */
import { revalidatePath } from "next/cache";
import { texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { borrarUsuarioBienvenida } from "@/lib/admin/bienvenida";
import { esId } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";

/** Borrar la cuenta de una persona que se registró con una tarjeta de bienvenida */
export async function borrarRegistradoBienvenida(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const usuarioId = texto(formulario, "usuarioId");
  if (!esId(usuarioId)) return { ok: false, mensaje: "No encontramos esa cuenta." };
  const resultado = await borrarUsuarioBienvenida(usuarioId);
  if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje };
  revalidatePath("/admin", "layout");
  return { ok: true, mensaje: `Cuenta de ${resultado.email} borrada.` };
}
