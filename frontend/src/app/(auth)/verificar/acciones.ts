"use server";

/**
 * PANTALLA DEL CÓDIGO (/verificar): comprobar el código y pedir otro.
 * Qué pasa con un código correcto depende del motivo:
 *   REGISTRO    → email verificado, este navegador pasa a ser de confianza y dentro
 *   DISPOSITIVO → este navegador pasa a ser de confianza, aviso por email y dentro
 *   RECUPERAR   → a elegir la contraseña nueva (/recuperar/nueva)
 */
import { enviarCorreo } from "@/lib/correo";
import { plantillaNuevoDispositivo } from "@/lib/correo/plantillas";
import { db } from "@/lib/db";
import { ipDelCliente, registrarIntento } from "@/lib/limite";
import { rutaSegura } from "@/lib/validaciones/cuenta";
import { comprobarCodigo, reenviarCodigo, terminarVerificacion } from "@/lib/verificacion/codigos";
import { confiarEnEsteNavegador } from "@/lib/verificacion/dispositivos";
import { abrirSesion } from "@/lib/verificacion/entrar";
import { CODIGO } from "@/lib/verificacion/reglas";

export type EstadoCodigo =
  | { ok: true; destino: string }
  | {
      ok: false;
      mensaje: string;
      /** "agotado" o "caducado": hay que pedir otro código; "reiniciar": volver a empezar */
      tipo?: "incorrecto" | "agotado" | "caducado" | "reiniciar";
    };

const DEMASIADOS = "Has hecho demasiados intentos seguidos. Espera unos minutos y vuelve a probar.";

/** Solo cifras, y exactamente las que tiene el código */
const FORMATO = new RegExp(`^[0-9]{${CODIGO.cifras}}$`);

export async function confirmarCodigo(codigo: string, volver: string): Promise<EstadoCodigo> {
  if (typeof codigo !== "string" || !FORMATO.test(codigo)) {
    return { ok: false, tipo: "incorrecto", mensaje: `El código tiene ${CODIGO.cifras} cifras.` };
  }

  // Límite por IP (además de los 5 intentos de cada código)
  if (!(await registrarIntento("verificarCodigo", await ipDelCliente()))) {
    return { ok: false, tipo: "incorrecto", mensaje: DEMASIADOS };
  }

  const resultado = await comprobarCodigo(codigo);
  switch (resultado.estado) {
    case "incorrecto":
      return {
        ok: false,
        tipo: "incorrecto",
        mensaje: `El código no es correcto. ${
          resultado.restantes === 1
            ? "Te queda 1 intento."
            : `Te quedan ${resultado.restantes} intentos.`
        }`,
      };
    case "caducado":
      return {
        ok: false,
        tipo: "caducado",
        mensaje: "Este código ha caducado. Pide uno nuevo con «Reenviar código».",
      };
    case "agotado":
      return {
        ok: false,
        tipo: "agotado",
        mensaje:
          "Has escrito mal el código demasiadas veces. Pide uno nuevo con «Reenviar código».",
      };
    case "sin-verificacion":
      return {
        ok: false,
        tipo: "reiniciar",
        mensaje: "Esta verificación ya no está activa. Vuelve a empezar.",
      };
  }

  const { id, usuarioId, motivo } = resultado.verificacion;

  // Cambiar la contraseña: el código está confirmado; falta elegir la nueva
  if (motivo === "RECUPERAR") return { ok: true, destino: "/recuperar/nueva" };

  try {
    const usuario = await db.usuario.update({
      where: { id: usuarioId },
      // Con REGISTRO acaba de confirmar su email; con DISPOSITIVO ya lo estaba
      data: motivo === "REGISTRO" ? { emailVerificadoEn: new Date() } : {},
      select: { id: true, rol: true, nombre: true, email: true },
    });
    if (!(await terminarVerificacion(id))) {
      return {
        ok: false,
        tipo: "reiniciar",
        mensaje: "Este código ya se ha usado. Vuelve a empezar.",
      };
    }
    const dispositivo = await confiarEnEsteNavegador(usuario);
    if (!(await abrirSesion(dispositivo.id))) throw new Error("No se ha abierto la sesión");

    // Aviso por email: si no ha entrado el dueño de la cuenta, sabrá que alguien tiene su contraseña
    if (motivo === "DISPOSITIVO") {
      await enviarCorreo(
        plantillaNuevoDispositivo({
          para: usuario.email,
          nombre: usuario.nombre,
          dispositivo: dispositivo.nombre,
          fecha: new Date(),
        }),
      );
    }
    return { ok: true, destino: rutaSegura(volver) };
  } catch (error) {
    console.error("Error al confirmar el código:", error);
    return { ok: false, tipo: "reiniciar", mensaje: "Algo ha fallado. Vuelve a iniciar sesión." };
  }
}

export async function pedirOtroCodigo() {
  if (!(await registrarIntento("reenviarCodigo", await ipDelCliente()))) {
    return { ok: false as const, mensaje: DEMASIADOS };
  }
  return reenviarCodigo();
}
