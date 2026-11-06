"use server";

/**
 * ACCIONES DEL PANEL: RESEÑAS
 * Cada acción comprueba primero que quien la llama es ADMIN.
 */
import type { EstadoFormulario } from "@/lib/admin/formularios";
import { texto } from "@/lib/admin/formularios";
import { refrescarTienda } from "@/lib/admin/refrescar";
import { db } from "@/lib/db";
import { idsValidos } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";

/** Publicar una reseña oculta o pendiente, u ocultar una publicada */
export async function cambiarPublicacionResena(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "id");
  if (!idsValidos(id)) return { ok: false, mensaje: "No encontramos esa reseña." };
  const resena = await db.resena.findUnique({ where: { id }, select: { estado: true } });
  if (!resena) return { ok: false, mensaje: "Esta reseña ya no existe." };

  const publicar = resena.estado !== "PUBLICADA";
  await db.resena.update({ where: { id }, data: { estado: publicar ? "PUBLICADA" : "OCULTA" } });
  refrescarTienda();
  return { ok: true, mensaje: publicar ? "Reseña publicada." : "Reseña ocultada." };
}

/** Borrar una reseña para siempre (la persona podrá escribir otra) */
export async function borrarResena(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "id");
  if (!idsValidos(id)) return { ok: false, mensaje: "No encontramos esa reseña." };
  await db.resena.deleteMany({ where: { id } });
  refrescarTienda();
  return { ok: true, mensaje: "Reseña borrada." };
}
