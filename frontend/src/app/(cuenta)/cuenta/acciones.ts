"use server";

/**
 * MI CUENTA (acciones del servidor)
 *   - Eliminar un dispositivo de confianza (su sesión se cierra)
 *   - Cerrar sesión en todos los dispositivos
 *   - Cambiar el nombre y la foto de perfil
 *   - Cambiar la contraseña (se cierran las sesiones de los demás dispositivos)
 * Cada acción comprueba la sesión: se pueden llamar desde fuera de la web.
 */
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { erroresDeZod, type EstadoFormulario } from "@/lib/admin/formularios";
import { enviarCorreo } from "@/lib/correo";
import { plantillaContrasenaCambiada } from "@/lib/correo/plantillas";
import { ErrorImagen, hayArchivo } from "@/lib/almacenamiento";
import { borrarFotoPerfil, subirFotoPerfil } from "@/lib/almacenamiento/fotoPerfil";
import { ErrorAlmacenPrivado } from "@/lib/almacenamiento/privado";
import { db } from "@/lib/db";
import { registrarIntento } from "@/lib/limite";
import { obtenerUsuario } from "@/lib/sesion";
import { esquemaCambioContrasena, esquemaCambioNombre } from "@/lib/validaciones/cuenta";
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

/** Cambia el nombre de la cuenta (el menú lo ve al recargar: ver el jwt de src/auth.ts) */
export async function cambiarNombre(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, mensaje: SIN_SESION };

  const datos = esquemaCambioNombre.safeParse({ nombre: formulario.get("nombre") });
  if (!datos.success) return { ok: false, errores: erroresDeZod(datos.error) };

  await db.usuario.update({ where: { id: usuario.id }, data: { nombre: datos.data.nombre } });
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Nombre cambiado." };
}

/**
 * Pone una foto de perfil nueva (se recorta en un cuadrado de 256 px) o, con «quitar», la quita.
 * La foto anterior se borra del almacén.
 */
export async function cambiarFoto(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, mensaje: SIN_SESION };

  const quitar = formulario.get("quitar") === "si";
  const archivo = formulario.get("foto");
  if (!quitar && !hayArchivo(archivo)) {
    return { ok: false, errores: { foto: "Elige una foto." } };
  }
  if (!(await registrarIntento("fotoPerfil", usuario.id))) {
    return { ok: false, mensaje: "Has cambiado la foto muchas veces. Espera un rato." };
  }

  let foto: string | null = null;
  if (!quitar && hayArchivo(archivo)) {
    try {
      foto = await subirFotoPerfil(archivo);
    } catch (error) {
      if (error instanceof ErrorImagen) return { ok: false, errores: { foto: error.message } };
      if (error instanceof ErrorAlmacenPrivado) {
        console.error("[foto de perfil]", error.message);
        return { ok: false, mensaje: "Ahora mismo no se pueden guardar fotos. Prueba más tarde." };
      }
      throw error;
    }
  }

  const antes = await db.usuario.findUniqueOrThrow({
    where: { id: usuario.id },
    select: { foto: true },
  });
  await db.usuario.update({ where: { id: usuario.id }, data: { foto } });
  await borrarFotoPerfil(antes.foto).catch(() => {}); // si ya no estaba, da igual
  revalidatePath("/", "layout");
  return { ok: true, mensaje: quitar ? "Foto quitada." : "Foto cambiada." };
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
