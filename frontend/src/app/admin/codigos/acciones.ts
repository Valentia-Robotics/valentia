"use server";

/**
 * ACCIONES DEL PANEL: CÓDIGOS DE ACTIVACIÓN
 * Cada acción comprueba primero que quien la llama es ADMIN.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { conErrores, texto, type EstadoFormulario } from "@/lib/admin/formularios";
import {
  cambiarDesactivacionEnBloque,
  crearLote,
  MAXIMO_LOTE,
  type EstadoCodigo,
} from "@/lib/admin/codigos";
import { db } from "@/lib/db";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { entero } from "@/lib/validaciones/admin";
import { esquemaId, idsValidos } from "@/lib/ids";

const esquemaLote = z.object({
  kitId: z.string().min(1, "Elige un kit").pipe(esquemaId),
  cantidad: entero(1, MAXIMO_LOTE),
});

/** Generar un lote de códigos nuevos y abrir su página para imprimirlos */
export async function generarLote(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const datos = esquemaLote.safeParse({
    kitId: texto(formulario, "kitId"),
    cantidad: texto(formulario, "cantidad"),
  });
  if (!datos.success) return conErrores(datos.error);

  const kit = await db.kit.findUnique({ where: { id: datos.data.kitId }, select: { id: true } });
  if (!kit)
    return { ok: false, mensaje: "Ese kit ya no existe.", errores: { kitId: "Elige otro kit." } };

  const loteId = await crearLote(datos.data.kitId, datos.data.cantidad);
  revalidatePath("/admin", "layout");
  redirect(`/admin/codigos/lotes/${loteId}?nuevo=1`);
}

/**
 * Desactivar un código (o volver a activarlo).
 * Desactivado ya no sirve para activar el curso. Si ya estaba usado, quien lo activó
 * CONSERVA su curso: solo deja de valer el código.
 */
export async function cambiarDesactivacion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "id");
  if (!idsValidos(id)) return { ok: false, mensaje: "No encontramos lo que quieres cambiar." };
  const codigo = await db.codigoActivacion.findUnique({
    where: { id },
    select: { desactivadoEn: true },
  });
  if (!codigo) return { ok: false, mensaje: "Este código ya no existe." };

  await db.codigoActivacion.update({
    where: { id },
    data: { desactivadoEn: codigo.desactivadoEn ? null : new Date() },
  });
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    mensaje: codigo.desactivadoEn ? "Código reactivado." : "Código desactivado.",
  };
}

const ESTADOS_VALIDOS: EstadoCodigo[] = ["libre", "usado", "desactivado"];

/**
 * Desactivar (o reactivar) de una vez todos los códigos que se ven con los filtros de la
 * página (todos, los de un kit, los de un lote, los de una búsqueda…).
 * Quien ya activó un código conserva su curso.
 */
export async function cambiarDesactivacionTodos(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const modo = texto(formulario, "modo");
  if (modo !== "desactivar" && modo !== "reactivar")
    return { ok: false, mensaje: "No sabemos qué quieres hacer. Recarga la página." };
  const estado = texto(formulario, "estado");
  const cambiados = await cambiarDesactivacionEnBloque(
    {
      q: texto(formulario, "q"),
      kitId: texto(formulario, "kit") || undefined,
      loteId: texto(formulario, "lote") || undefined,
      estado: ESTADOS_VALIDOS.find((e) => e === estado),
    },
    modo === "desactivar",
  );
  revalidatePath("/admin", "layout");
  const palabra = cambiados === 1 ? "código" : "códigos";
  return {
    ok: true,
    mensaje:
      modo === "desactivar"
        ? `${cambiados} ${palabra} desactivado${cambiados === 1 ? "" : "s"}.`
        : `${cambiados} ${palabra} reactivado${cambiados === 1 ? "" : "s"}.`,
  };
}
