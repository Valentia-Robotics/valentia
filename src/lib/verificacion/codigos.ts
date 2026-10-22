/**
 * CÓDIGOS DE VERIFICACIÓN POR EMAIL
 * Sirven para confirmar el email al registrarse, entrar desde un dispositivo nuevo
 * y cambiar la contraseña olvidada.
 *
 * Cómo funciona:
 *   1. empezarVerificacion() crea la verificación, envía el código y guarda en el navegador
 *      una cookie con un token al azar (así /verificar sabe qué verificación es la tuya).
 *   2. comprobarCodigo() mira el código: caduca a los 10 minutos, máximo 5 intentos.
 *   3. reenviarCodigo() manda uno nuevo (60 s de espera entre envíos y máximo 5 por hora).
 *
 * Verificaciones "señuelo": si el email no tiene cuenta (o ya la tiene, al registrarse),
 * se crea igualmente una verificación que por fuera parece idéntica, pero ningún código
 * vale. Así nadie puede averiguar qué emails están registrados.
 */
import "server-only";
import { cookies } from "next/headers";
import type { MotivoVerificacion } from "@/generated/prisma/enums";
import { enviarCorreo, type Correo } from "@/lib/correo";
import { plantillaCodigo, type MotivoCodigo } from "@/lib/correo/plantillas";
import { db } from "@/lib/db";
import { generarCodigo, generarToken, hashCodigo, hashToken, mismaHuella } from "./cripto";
import { limpiarPendientesCaducados } from "./pendientes";
import { CODIGO, COOKIES } from "./reglas";

const MOTIVO_PLANTILLA: Record<MotivoVerificacion, MotivoCodigo> = {
  REGISTRO: "registro",
  DISPOSITIVO: "dispositivo",
  RECUPERAR: "recuperar",
};

const segundos = (n: number) => n * 1000;
const formatoHora = new Intl.DateTimeFormat("es-ES", {
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

/** Respuesta cuando no se puede enviar (todavía) un código */
export interface NoEnviado {
  ok: false;
  mensaje: string;
}

// ---------------------------------------------------------------------------
// Cookie de la verificación en curso
// ---------------------------------------------------------------------------

async function guardarCookie(token: string) {
  (await cookies()).set(COOKIES.verificacion, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // una hora: de sobra para escribir el código
  });
}

/** Olvida la verificación en curso de este navegador */
export async function borrarCookieVerificacion() {
  (await cookies()).delete(COOKIES.verificacion);
}

/** La verificación en curso de este navegador (o null) */
async function verificacionActual() {
  const token = (await cookies()).get(COOKIES.verificacion)?.value;
  if (!token) return null;
  return db.verificacion.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: { select: { id: true, nombre: true } } },
  });
}

// ---------------------------------------------------------------------------
// Límite de envíos
// ---------------------------------------------------------------------------

/** Comprueba el máximo de envíos por hora de un email. Devuelve un mensaje si se ha pasado. */
async function superaLimiteHora(email: string): Promise<NoEnviado | null> {
  const haceUnaHora = new Date(Date.now() - 60 * 60_000);
  const envios = await db.envioCodigo.findMany({
    where: { email, enviadoEn: { gt: haceUnaHora } },
    orderBy: { enviadoEn: "asc" },
    select: { enviadoEn: true },
  });
  if (envios.length < CODIGO.enviosPorHora) return null;
  // Se podrá volver a pedir cuando el envío más antiguo cumpla una hora
  const libre = new Date(envios[0].enviadoEn.getTime() + 60 * 60_000);
  return {
    ok: false,
    mensaje: `Hemos enviado ya muchos códigos a este email. Podrás pedir otro a partir de las ${formatoHora.format(libre)}.`,
  };
}

/**
 * Crea un código nuevo, lo apunta para el límite por hora y lo envía (si no es un señuelo).
 * "enlace": ruta que abre la pantalla del código en cualquier navegador (lo usa el panel).
 */
async function nuevoCodigo(
  email: string,
  motivo: MotivoVerificacion,
  usuario: { nombre: string } | null,
  { minutos = CODIGO.minutosValidez, enlace }: { minutos?: number; enlace?: string } = {},
) {
  const codigo = generarCodigo();
  const ahora = new Date();
  await db.envioCodigo.create({ data: { email, enviadoEn: ahora } });
  if (usuario) {
    await enviarCorreo(
      plantillaCodigo({
        para: email,
        nombre: usuario.nombre,
        codigo,
        motivo: MOTIVO_PLANTILLA[motivo],
        minutos,
        enlace,
      }),
    );
  }
  return {
    // Un señuelo guarda la huella de un código que nadie conoce
    codigoHash: hashCodigo(email, motivo, usuario ? codigo : generarCodigo() + generarToken()),
    intentos: 0,
    enviadoEn: ahora,
    caducaEn: new Date(ahora.getTime() + minutos * 60_000),
  };
}

// ---------------------------------------------------------------------------
// Empezar, comprobar y reenviar
// ---------------------------------------------------------------------------

/**
 * Empieza una verificación y envía el código.
 *   usuario       → a quién pertenece (null = señuelo: no se envía código)
 *   correoSenuelo → correo opcional que se envía en lugar del código en un señuelo
 *                   (por ejemplo "Ya tienes una cuenta" al registrarse con un email usado)
 */
export async function empezarVerificacion(opciones: {
  email: string;
  motivo: MotivoVerificacion;
  usuario: { id: string; nombre: string } | null;
  correoSenuelo?: Correo;
}): Promise<{ ok: true } | NoEnviado> {
  const { email, motivo, usuario } = opciones;
  const ahora = new Date();
  const token = generarToken();

  // Limpieza de vez en cuando: verificaciones de hace más de un día y envíos de hace más de una hora
  await db.verificacion.deleteMany({
    where: { creadoEn: { lt: new Date(ahora.getTime() - 24 * 60 * 60_000) } },
  });
  await db.envioCodigo.deleteMany({
    where: { enviadoEn: { lt: new Date(ahora.getTime() - 60 * 60_000) } },
  });
  // …y cuentas que llevan más de una semana sin confirmar su email
  await limpiarPendientesCaducados(ahora);

  // ¿Acabamos de enviar un código para lo mismo (por ejemplo, ha vuelto a pulsar "Entrar")?
  // Entonces no enviamos otro: seguimos con el mismo código que ya tiene en su correo.
  const previa = await db.verificacion.findFirst({
    where: { email, motivo, usadoEn: null, confirmadoEn: null, caducaEn: { gt: ahora } },
    orderBy: { enviadoEn: "desc" },
  });
  const reciente =
    previa &&
    previa.usuarioId === (usuario?.id ?? null) &&
    previa.intentos < CODIGO.maximoIntentos &&
    previa.enviadoEn.getTime() > ahora.getTime() - segundos(CODIGO.segundosEntreEnvios);

  let datosCodigo;
  if (reciente) {
    const { codigoHash, intentos, enviadoEn, caducaEn } = previa;
    datosCodigo = { codigoHash, intentos, enviadoEn, caducaEn };
  } else {
    const limite = await superaLimiteHora(email);
    if (limite) return limite;
    datosCodigo = await nuevoCodigo(email, motivo, usuario);
    if (!usuario && opciones.correoSenuelo) await enviarCorreo(opciones.correoSenuelo);
  }

  // Solo puede haber una verificación abierta por email y motivo
  await db.verificacion.deleteMany({ where: { email, motivo, usadoEn: null } });
  await db.verificacion.create({
    data: {
      tokenHash: hashToken(token),
      usuarioId: usuario?.id ?? null,
      email,
      motivo,
      ...datosCodigo,
    },
  });
  await guardarCookie(token);
  return { ok: true };
}

/** Lo que necesita la pantalla /verificar (o null si no hay ninguna verificación en curso) */
export async function datosVerificacion() {
  const v = await verificacionActual();
  if (!v || v.usadoEn) return null;
  const restantes = v.enviadoEn.getTime() + segundos(CODIGO.segundosEntreEnvios) - Date.now();
  return {
    email: v.email,
    motivo: v.motivo,
    confirmada: v.confirmadoEn !== null,
    /** Segundos que faltan para poder pedir otro código */
    esperaReenvio: Math.max(0, Math.ceil(restantes / 1000)),
  };
}

export type ResultadoCodigo =
  | {
      estado: "correcto";
      verificacion: { id: string; usuarioId: string; motivo: MotivoVerificacion };
    }
  | { estado: "incorrecto"; restantes: number }
  | { estado: "caducado" }
  | { estado: "agotado" }
  | { estado: "sin-verificacion" };

/** Comprueba el código escrito para la verificación en curso de este navegador */
export async function comprobarCodigo(codigo: string): Promise<ResultadoCodigo> {
  const v = await verificacionActual();
  if (!v || v.usadoEn) return { estado: "sin-verificacion" };

  // Si ya se confirmó (por ejemplo, al pulsar dos veces), no hace falta volver a comprobarlo
  if (v.confirmadoEn && v.usuarioId) {
    return {
      estado: "correcto",
      verificacion: { id: v.id, usuarioId: v.usuarioId, motivo: v.motivo },
    };
  }
  if (v.intentos >= CODIGO.maximoIntentos) return { estado: "agotado" };
  if (v.caducaEn.getTime() < Date.now()) return { estado: "caducado" };

  // Contamos el intento ANTES de comprobarlo, y solo si quedan: así, aunque alguien
  // mande muchos intentos a la vez, nunca pasa de 5
  const contado = await db.verificacion.updateMany({
    where: { id: v.id, intentos: { lt: CODIGO.maximoIntentos }, confirmadoEn: null },
    data: { intentos: { increment: 1 } },
  });
  if (contado.count === 0) return { estado: "agotado" };

  const correcto =
    v.usuarioId !== null && mismaHuella(hashCodigo(v.email, v.motivo, codigo), v.codigoHash);
  if (!correcto) {
    const restantes = CODIGO.maximoIntentos - (v.intentos + 1);
    return restantes > 0 ? { estado: "incorrecto", restantes } : { estado: "agotado" };
  }

  await db.verificacion.update({ where: { id: v.id }, data: { confirmadoEn: new Date() } });
  return {
    estado: "correcto",
    verificacion: { id: v.id, usuarioId: v.usuarioId!, motivo: v.motivo },
  };
}

/** Envía un código nuevo para la verificación en curso de este navegador */
export async function reenviarCodigo(): Promise<
  { ok: true; espera: number } | (NoEnviado & { espera?: number })
> {
  const v = await verificacionActual();
  if (!v || v.usadoEn || v.confirmadoEn) {
    return { ok: false, mensaje: "Esta verificación ya no está activa. Vuelve a empezar." };
  }

  const restantes = v.enviadoEn.getTime() + segundos(CODIGO.segundosEntreEnvios) - Date.now();
  if (restantes > 0) {
    const espera = Math.ceil(restantes / 1000);
    return { ok: false, mensaje: `Espera ${espera} segundos para pedir otro código.`, espera };
  }

  const limite = await superaLimiteHora(v.email);
  if (limite) return limite;

  // El código anterior deja de valer y los intentos vuelven a empezar
  await db.verificacion.update({
    where: { id: v.id },
    data: await nuevoCodigo(v.email, v.motivo, v.usuario),
  });
  return { ok: true, espera: CODIGO.segundosEntreEnvios };
}

/**
 * Desde el panel: envía a una cuenta pendiente un código nuevo para confirmar su email.
 * Como el código solo vale en el navegador que tiene la cookie de la verificación, el correo
 * lleva además un enlace secreto (/verificar/enlace?t=…) que pone esa cookie en el navegador
 * donde se abra. El código vale CODIGO.horasValidezEnlace horas (y se puede pedir otro allí).
 */
export async function enviarCodigoConEnlace(usuario: {
  id: string;
  nombre: string;
  email: string;
}): Promise<{ ok: true } | NoEnviado> {
  const { email } = usuario;
  const previa = await db.verificacion.findFirst({
    where: { email, motivo: "REGISTRO", usadoEn: null, confirmadoEn: null },
    orderBy: { enviadoEn: "desc" },
    select: { enviadoEn: true },
  });
  if (previa && previa.enviadoEn.getTime() > Date.now() - segundos(CODIGO.segundosEntreEnvios)) {
    return {
      ok: false,
      mensaje: "Acaba de recibir un código. Espera un minuto antes de enviar otro.",
    };
  }
  const limite = await superaLimiteHora(email);
  if (limite) return limite;

  const token = generarToken();
  const datosCodigo = await nuevoCodigo(email, "REGISTRO", usuario, {
    minutos: CODIGO.horasValidezEnlace * 60,
    enlace: `/verificar/enlace?t=${token}`,
  });
  // El código anterior (si había) deja de valer: solo una verificación abierta por email y motivo
  await db.verificacion.deleteMany({ where: { email, motivo: "REGISTRO", usadoEn: null } });
  await db.verificacion.create({
    data: {
      tokenHash: hashToken(token),
      usuarioId: usuario.id,
      email,
      motivo: "REGISTRO",
      ...datosCodigo,
    },
  });
  return { ok: true };
}

/**
 * El enlace del correo enviado desde el panel: si sigue valiendo, guarda su cookie en este
 * navegador (así /verificar sabe qué verificación es). Devuelve false si ya no vale.
 */
export async function abrirEnlaceVerificacion(token: string): Promise<boolean> {
  const v = await db.verificacion.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { motivo: true, usadoEn: true, usuario: { select: { emailVerificadoEn: true } } },
  });
  if (!v || v.motivo !== "REGISTRO" || v.usadoEn || !v.usuario || v.usuario.emailVerificadoEn) {
    return false;
  }
  await guardarCookie(token);
  return true;
}

/**
 * Da por terminada una verificación (ya no se puede volver a usar) y borra su cookie.
 * Devuelve false si otra petición la había terminado antes.
 */
export async function terminarVerificacion(id: string): Promise<boolean> {
  const marcada = await db.verificacion.updateMany({
    where: { id, usadoEn: null, confirmadoEn: { not: null } },
    data: { usadoEn: new Date() },
  });
  await borrarCookieVerificacion();
  return marcada.count === 1;
}

/**
 * Para "¿Olvidaste tu contraseña?": la verificación de este navegador si ya se escribió
 * el código correcto hace menos de 10 minutos (o null). Solo entonces se puede elegir
 * la contraseña nueva.
 */
export async function recuperacionConfirmada() {
  const v = await verificacionActual();
  if (!v || v.motivo !== "RECUPERAR" || v.usadoEn || !v.confirmadoEn || !v.usuario) return null;
  const caduca = v.confirmadoEn.getTime() + CODIGO.minutosValidez * 60_000;
  if (caduca < Date.now()) return null;
  return { id: v.id, usuario: v.usuario, email: v.email };
}
