"use server";

/**
 * ACCIONES DEL PANEL: VALOR DE LA EMPRESA (ADMIN y SIGMA)
 * Apuntar un valor nuevo (los anteriores se quedan como historial) o borrar uno.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { conErrores, texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { esquemaValoracion } from "@/lib/validaciones/acciones";

export async function guardarValoracion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirAdminEnAccion();
  const datos = esquemaValoracion.safeParse({
    importe: texto(formulario, "importe"),
    nota: texto(formulario, "nota"),
  });
  if (!datos.success) return conErrores(datos.error);

  await db.valoracionEmpresa.create({
    data: {
      importeCentimos: datos.data.importe,
      nota: datos.data.nota,
      creadoPor: usuario.nombre || usuario.email,
    },
  });
  revalidatePath("/admin/acciones");
  redirect("/admin/acciones?guardado=1");
}

export async function borrarValoracion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "valoracionId");
  if (!esId(id)) return { ok: false, mensaje: "No encontramos ese valor." };
  await db.valoracionEmpresa.deleteMany({ where: { id } });
  revalidatePath("/admin/acciones");
  redirect("/admin/acciones?borrado=1");
}
