"use server";

/**
 * ACCIONES DEL PANEL: USUARIOS PENDIENTES DE VERIFICAR
 * Solo sirven para cuentas que no han confirmado su email: a una cuenta verificada
 * no se le puede reenviar el código ni borrar desde aquí.
 * Cada acción comprueba primero que quien la llama es ADMIN.
 */
import { revalidatePath } from "next/cache";
import { texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { enviarCodigoConEnlace } from "@/lib/verificacion/codigos";
import { borrarPendientes, USUARIO_PENDIENTE } from "@/lib/verificacion/pendientes";

const YA_NO_PENDIENTE =
  "Esta cuenta ya no está pendiente: o ha confirmado su email o ya no existe.";

/** Busca la cuenta pendiente del formulario (o null) */
async function pendienteDelFormulario(formulario: FormData) {
  const id = texto(formulario, "id");
  if (!esId(id)) return null;
  return db.usuario.findFirst({
    where: { id, ...USUARIO_PENDIENTE },
    select: { id: true, nombre: true, email: true },
  });
}

/** Reenviar el código de verificación (con un enlace para abrir la pantalla del código) */
export async function reenviarVerificacion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const usuario = await pendienteDelFormulario(formulario);
  if (!usuario) return { ok: false, mensaje: YA_NO_PENDIENTE };

  const enviado = await enviarCodigoConEnlace(usuario);
  if (!enviado.ok) return enviado;
  revalidatePath("/admin/usuarios"); // la fila enseña la hora del último código
  return { ok: true, mensaje: `Código enviado a ${usuario.email}.` };
}

/** Borrar una cuenta pendiente (y sus códigos) */
export async function borrarPendiente(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const usuario = await pendienteDelFormulario(formulario);
  if (!usuario) return { ok: false, mensaje: YA_NO_PENDIENTE };

  // borrarPendientes vuelve a comprobar que sigue sin verificar justo al borrar
  if ((await borrarPendientes({ id: usuario.id })) === 0) {
    return { ok: false, mensaje: YA_NO_PENDIENTE };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, mensaje: `Cuenta de ${usuario.email} eliminada.` };
}
