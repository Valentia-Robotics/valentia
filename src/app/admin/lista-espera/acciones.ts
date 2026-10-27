"use server";

/**
 * ACCIONES DEL PANEL: LISTA DE ESPERA
 * Borrar a alguien (si pide que quitemos su email). Solo para ADMIN.
 */
import { revalidatePath } from "next/cache";
import { type EstadoFormulario, texto } from "@/lib/admin/formularios";
import { db } from "@/lib/db";
import { idsValidos } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";

export async function borrarDeListaEspera(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "id");
  if (!idsValidos(id)) return { ok: false, mensaje: "No encontramos ese email." };
  await db.listaEspera.deleteMany({ where: { id } });
  revalidatePath("/admin/lista-espera");
  return { ok: true, mensaje: "Email borrado de la lista." };
}
