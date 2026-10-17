"use server";

/**
 * ¿OLVIDASTE TU CONTRASEÑA? (acciones del servidor)
 *   1. pedirCodigoRecuperacion: envía un código al email (si tiene cuenta; si no, un "señuelo"
 *      que por fuera parece igual, para no desvelar qué emails están registrados).
 *   2. El código se escribe en /verificar.
 *   3. guardarContrasenaNueva: cambia la contraseña, cierra la sesión en todos los
 *      dispositivos y deja dentro a este navegador.
 */
import bcrypt from "bcryptjs";
import { erroresDeZod, type EstadoFormulario } from "@/lib/admin/formularios";
import { enviarCorreo } from "@/lib/correo";
import { plantillaContrasenaCambiada } from "@/lib/correo/plantillas";
import { db } from "@/lib/db";
import { ipDelCliente, registrarIntento } from "@/lib/limite";
import { esquemaContrasenaNueva, esquemaRecuperar } from "@/lib/validaciones/cuenta";
import {
  empezarVerificacion,
  recuperacionConfirmada,
  terminarVerificacion,
} from "@/lib/verificacion/codigos";
import { confiarEnEsteNavegador, olvidarDispositivos } from "@/lib/verificacion/dispositivos";
import { abrirSesion } from "@/lib/verificacion/entrar";

const ERROR_GENERICO = "Algo ha fallado. Inténtalo de nuevo en unos segundos.";

export async function pedirCodigoRecuperacion(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const datos = esquemaRecuperar.safeParse({ email: formulario.get("email") });
  if (!datos.success) return { ok: false, errores: erroresDeZod(datos.error) };

  if (!(await registrarIntento("recuperar", await ipDelCliente()))) {
    return { ok: false, mensaje: "Demasiados intentos seguidos. Espera unos minutos." };
  }

  try {
    const { email } = datos.data;
    const usuario = await db.usuario.findUnique({
      where: { email },
      select: { id: true, nombre: true },
    });
    // Sin cuenta → señuelo (usuario null): la pantalla siguiente es la misma
    const resultado = await empezarVerificacion({ email, motivo: "RECUPERAR", usuario });
    return resultado.ok ? { ok: true } : resultado;
  } catch (error) {
    console.error("Error al pedir el código de recuperación:", error);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}

export type EstadoContrasenaNueva = EstadoFormulario & { destino?: string };

export async function guardarContrasenaNueva(
  _anterior: EstadoContrasenaNueva,
  formulario: FormData,
): Promise<EstadoContrasenaNueva> {
  const datos = esquemaContrasenaNueva.safeParse({ nueva: formulario.get("nueva") });
  if (!datos.success) return { ok: false, errores: erroresDeZod(datos.error) };

  // Solo si en este navegador se ha escrito bien el código hace menos de 10 minutos
  const recuperacion = await recuperacionConfirmada();
  if (!recuperacion) {
    return {
      ok: false,
      mensaje: "Ha pasado demasiado tiempo desde que escribiste el código. Vuelve a empezar.",
    };
  }

  try {
    const { usuario } = recuperacion;
    // Primero la gastamos: así no se puede usar dos veces
    if (!(await terminarVerificacion(recuperacion.id))) {
      return { ok: false, mensaje: "Este código ya se ha usado. Vuelve a empezar." };
    }

    const cuenta = await db.usuario.update({
      where: { id: usuario.id },
      data: { contrasenaHash: await bcrypt.hash(datos.data.nueva, 10) },
      select: { id: true, rol: true, nombre: true, email: true },
    });
    // Ha demostrado que el email es suyo: si estaba sin verificar, ya lo está
    await db.usuario.updateMany({
      where: { id: cuenta.id, emailVerificadoEn: null },
      data: { emailVerificadoEn: new Date() },
    });

    // Se cierran TODAS las sesiones (por si alguien más conocía la contraseña antigua)
    // y este navegador pasa a ser de confianza: acaba de demostrar que es el dueño del email
    await olvidarDispositivos(cuenta.id);
    await db.verificacion.deleteMany({ where: { usuarioId: cuenta.id, usadoEn: null } });
    const dispositivo = await confiarEnEsteNavegador(cuenta);
    await enviarCorreo(plantillaContrasenaCambiada({ para: cuenta.email, nombre: cuenta.nombre }));

    if (!(await abrirSesion(dispositivo.id))) {
      // La contraseña ya está cambiada: que entre con ella
      return { ok: true, destino: "/login" };
    }
    return { ok: true, destino: "/cursos" };
  } catch (error) {
    console.error("Error al guardar la contraseña nueva:", error);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}
