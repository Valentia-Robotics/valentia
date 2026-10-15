"use server";

/**
 * CREAR CUENTA E INICIAR SESIÓN (en el servidor)
 *
 * Registro: crea la cuenta (sin verificar) y envía un código al email → /verificar.
 * Login: comprueba la contraseña y después…
 *   - email sin verificar          → código para verificarlo → /verificar
 *   - navegador de confianza       → dentro
 *   - navegador nuevo              → código al email → /verificar
 *
 * Los mensajes nunca dicen si un email tiene cuenta o no.
 */
import bcrypt from "bcryptjs";
import { z } from "zod";
import { plantillaIntentoRegistro } from "@/lib/correo/plantillas";
import { db } from "@/lib/db";
import { ipDelCliente, registrarIntento } from "@/lib/limite";
import { esquemaLogin, esquemaRegistro } from "@/lib/validaciones/cuenta";
import { empezarVerificacion } from "@/lib/verificacion/codigos";
import { dispositivoDeConfianza } from "@/lib/verificacion/dispositivos";
import { abrirSesion } from "@/lib/verificacion/entrar";

export interface EstadoCuenta {
  ok: boolean;
  /** Con ok: "verificar" = hay que escribir un código; "dentro" = sesión iniciada */
  paso?: "verificar" | "dentro";
  mensaje?: string;
  errores?: Partial<Record<"nombre" | "email" | "contrasena", string>>;
}

const ERROR_GENERICO = "Algo ha fallado. Inténtalo de nuevo en unos segundos.";

/** Convierte los errores de Zod en un mensaje por campo */
function erroresPorCampo(error: z.ZodError): EstadoCuenta {
  const { fieldErrors } = z.flattenError(error);
  return {
    ok: false,
    errores: Object.fromEntries(
      Object.entries(fieldErrors).map(([campo, mensajes]) => [campo, (mensajes as string[])?.[0]]),
    ),
  };
}

/**
 * Huella de una contraseña inventada. Si el email no tiene cuenta, comparamos con ella
 * igualmente: así la respuesta tarda lo mismo y no se nota si el email existe.
 */
const HUELLA_FALSA = bcrypt.hashSync("contraseña-que-nadie-tiene", 10);

export async function registrarse(formulario: FormData): Promise<EstadoCuenta> {
  const datos = esquemaRegistro.safeParse({
    nombre: formulario.get("nombre"),
    email: formulario.get("email"),
    contrasena: formulario.get("contrasena"),
  });
  if (!datos.success) return erroresPorCampo(datos.error);

  // Máximo de registros por IP (ver src/lib/limite.ts). Cuentan todos, también los de
  // emails que ya tienen cuenta: si no, el límite desvelaría cuáles existen.
  if (!registrarIntento("registro", await ipDelCliente())) {
    return {
      ok: false,
      mensaje: "Se han creado muchas cuentas desde aquí. Espera un rato y vuelve a intentarlo.",
    };
  }

  const { nombre, email, contrasena } = datos.data;
  // Cifrado con bcrypt (10 rondas): aunque alguien viera la base de datos, no podría leer la contraseña
  const contrasenaHash = await bcrypt.hash(contrasena, 10);

  try {
    const existente = await db.usuario.findUnique({
      where: { email },
      select: { nombre: true },
    });

    // Email ya registrado: hacemos como si nada (pantalla del código igual), pero en vez
    // del código le llega al dueño un aviso de "ya tienes una cuenta".
    const resultado = existente
      ? await empezarVerificacion({
          email,
          motivo: "REGISTRO",
          usuario: null,
          correoSenuelo: plantillaIntentoRegistro({ para: email, nombre: existente.nombre }),
        })
      : await empezarVerificacion({
          email,
          motivo: "REGISTRO",
          usuario: await db.usuario.create({
            data: { nombre, email, contrasenaHash },
            select: { id: true, nombre: true },
          }),
        });
    return resultado.ok ? { ok: true, paso: "verificar" } : resultado;
  } catch (error) {
    console.error("Error al crear la cuenta:", error);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}

export async function iniciarSesion(formulario: FormData): Promise<EstadoCuenta> {
  const datos = esquemaLogin.safeParse({
    email: formulario.get("email"),
    contrasena: formulario.get("contrasena"),
  });
  if (!datos.success) return erroresPorCampo(datos.error);
  const { email, contrasena } = datos.data;

  // Máximo de intentos por IP y email (ver src/lib/limite.ts)
  if (!registrarIntento("login", `${await ipDelCliente()}:${email}`)) {
    return {
      ok: false,
      mensaje: "Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.",
    };
  }

  try {
    const usuario = await db.usuario.findUnique({
      where: { email },
      select: { id: true, nombre: true, rol: true, contrasenaHash: true, emailVerificadoEn: true },
    });
    // Comparamos con la huella guardada (la contraseña nunca se guarda tal cual)
    const correcta = await bcrypt.compare(contrasena, usuario?.contrasenaHash ?? HUELLA_FALSA);
    if (!usuario || !correcta) {
      return { ok: false, mensaje: "El email o la contraseña no son correctos." };
    }

    // Todavía no ha confirmado su email (por ejemplo, cerró la página del código)
    if (!usuario.emailVerificadoEn) {
      const resultado = await empezarVerificacion({ email, motivo: "REGISTRO", usuario });
      return resultado.ok ? { ok: true, paso: "verificar" } : resultado;
    }

    // Navegador de confianza: dentro sin código
    const dispositivoId = await dispositivoDeConfianza(usuario.id);
    if (dispositivoId) {
      return (await abrirSesion(dispositivoId))
        ? { ok: true, paso: "dentro" }
        : { ok: false, mensaje: ERROR_GENERICO };
    }

    // Navegador nuevo: le pedimos un código
    const resultado = await empezarVerificacion({ email, motivo: "DISPOSITIVO", usuario });
    return resultado.ok ? { ok: true, paso: "verificar" } : resultado;
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}
