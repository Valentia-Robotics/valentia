"use server";

/**
 * ACCIONES DEL PANEL: FINANZAS (solo ADMIN)
 * Apuntar, cambiar y borrar ingresos y gastos. Los pedidos de la web no se tocan aquí.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { conErrores, texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { db } from "@/lib/db";
import { esId, idsValidos } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { esquemaMovimiento } from "@/lib/validaciones/finanzas";

/** Crear (sin movimientoId) o editar (con movimientoId) un ingreso o un gasto */
export async function guardarMovimiento(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirAdminEnAccion();
  const id = texto(formulario, "movimientoId");
  if (!idsValidos(id)) return { ok: false, mensaje: "No encontramos lo que quieres cambiar." };

  const datos = esquemaMovimiento.safeParse({
    tipo: texto(formulario, "tipo"),
    concepto: texto(formulario, "concepto"),
    categoria: texto(formulario, "categoria"),
    importe: texto(formulario, "importe"),
    iva: texto(formulario, "iva"),
    fecha: texto(formulario, "fecha"),
    contraparte: texto(formulario, "contraparte"),
    notas: texto(formulario, "notas"),
  });
  if (!datos.success) return conErrores(datos.error);

  if (id) {
    const cambiados = await db.movimientoDinero.updateMany({ where: { id }, data: datos.data });
    if (cambiados.count === 0) return { ok: false, mensaje: "Este apunte ya no existe." };
  } else {
    await db.movimientoDinero.create({
      data: { ...datos.data, creadoPor: usuario.nombre || usuario.email },
    });
  }
  revalidatePath("/admin/finanzas");
  redirect(`/admin/finanzas?guardado=${datos.data.tipo === "INGRESO" ? "ingreso" : "gasto"}`);
}

export async function borrarMovimiento(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "movimientoId");
  if (!esId(id)) return { ok: false, mensaje: "No encontramos ese apunte." };
  await db.movimientoDinero.deleteMany({ where: { id } });
  revalidatePath("/admin/finanzas");
  redirect("/admin/finanzas?borrado=1");
}
