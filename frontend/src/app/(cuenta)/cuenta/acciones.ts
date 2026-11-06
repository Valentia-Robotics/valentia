"use server";

/**
 * MI CUENTA (acciones del servidor)
 *   - Eliminar un dispositivo de confianza (su sesión se cierra)
 *   - Cerrar sesión en todos los dispositivos
 *   - Cambiar la contraseña (se cierran las sesiones de los demás dispositivos)
 * Cada acción comprueba la sesión: se pueden llamar desde fuera de la web.
 */
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { erroresDeZod, type EstadoFormulario } from "@/lib/admin/formularios";
import { enviarCorreo } from "@/lib/correo";
import { plantillaContrasenaCambiada } from "@/lib/correo/plantillas";
import { db } from "@/lib/db";
import { registrarIntento } from "@/lib/limite";
import { obtenerUsuario } from "@/lib/sesion";
import { esquemaCambioContrasena } from "@/lib/validaciones/cuenta";
import { dispositivoDeConfianza, olvidarDispositivos } from "@/lib/verificacion/dispositivos";
import { esquemaId } from "@/lib/ids";

/** Identificador de un dispositivo o una dirección (cuid) */

const SIN_SESION = "Tu sesión ha caducado. Vuelve a iniciar sesión.";

export interface EstadoDispositivo {
  ok: boolean;
  mensaje?: string;
  /** true si se ha eliminado el dispositivo desde el que se está usando la web */
  sesionCerrada?: boolean;
}

/** Elimina uno de tus dispositivos de confianza (y cierra su sesión) */
export async function eliminarDispositivo(id: string): Promise<EstadoDispositivo> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, mensaje: SIN_SESION, sesionCerrada: true };
  if (!esquemaId.safeParse(id).success) return { ok: false, mensaje: "Dispositivo no válido." };

  const esteNavegador = await dispositivoDeConfianza(usuario.id);
  // Solo se borra si es TUYO (where con usuarioId)
  const { count } = await db.dispositivoConfianza.deleteMany({
    where: { id, usuarioId: usuario.id },
  });
  revalidatePath("/cuenta");
  if (count === 0) return { ok: false, mensaje: "Ese dispositivo ya no estaba en la lista." };
  return { ok: true, sesionCerrada: id === esteNavegador };
}

/** Olvida TODOS tus dispositivos: se cierra la sesión en todos (también en este) */
export async function cerrarSesionEnTodos(): Promise<EstadoDispositivo> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, mensaje: SIN_SESION, sesionCerrada: true };
  await olvidarDispositivos(usuario.id);
  return { ok: true, sesionCerrada: true };
}

/** Cambia la contraseña. Este navegador sigue dentro; los demás tendrán que volver a entrar con código. */
export async function cambiarContrasena(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, mensaje: SIN_SESION };

  const datos = esquemaCambioContrasena.safeParse({
    actual: formulario.get("actual"),
    nueva: formulario.get("nueva"),
  });
  if (!datos.success) return { ok: false, errores: erroresDeZod(datos.error) };

  // Por si alguien con la sesión abierta intenta adivinar la contraseña actual
  if (!(await registrarIntento("cambiarContrasena", usuario.id))) {
    return { ok: false, mensaje: "Demasiados intentos seguidos. Espera unos minutos." };
  }

  const guardado = await db.usuario.findUniqueOrThrow({
    where: { id: usuario.id },
    select: { contrasenaHash: true },
  });
  if (!(await bcrypt.compare(datos.data.actual, guardado.contrasenaHash))) {
    return { ok: false, errores: { actual: "La contraseña actual no es correcta" } };
  }

  await db.usuario.update({
    where: { id: usuario.id },
    data: { contrasenaHash: await bcrypt.hash(datos.data.nueva, 10) },
  });
  // Se olvidan todos los dispositivos de confianza menos este (así sigues dentro)
  const esteNavegador = await dispositivoDeConfianza(usuario.id);
  const cerradas = await olvidarDispositivos(usuario.id, esteNavegador ?? undefined);
  // Si había un "¿Olvidaste tu contraseña?" a medias, ya no sirve
  await db.verificacion.deleteMany({ where: { usuarioId: usuario.id, usadoEn: null } });
  await enviarCorreo(plantillaContrasenaCambiada({ para: usuario.email, nombre: usuario.nombre }));

  revalidatePath("/cuenta");
  return {
    ok: true,
    mensaje:
      cerradas > 0
        ? "Contraseña cambiada. Hemos cerrado la sesión en tus otros dispositivos."
        : "Contraseña cambiada.",
  };
}

/** Borra una de tus direcciones guardadas (solo si es TUYA) */
export async function eliminarDireccion(id: string): Promise<{ ok: boolean }> {
  const usuario = await obtenerUsuario();
  if (!usuario || !esquemaId.safeParse(id).success) return { ok: false };
  const { count } = await db.direccion.deleteMany({ where: { id, usuarioId: usuario.id } });
  revalidatePath("/cuenta");
  return { ok: count === 1 };
}
