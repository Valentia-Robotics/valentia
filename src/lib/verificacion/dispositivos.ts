/**
 * DISPOSITIVOS DE CONFIANZA
 * Cuando alguien confirma con un código que es él, su navegador recibe una cookie con un
 * token al azar y pasa a ser "de confianza": no se le vuelve a pedir código durante
 * 30 días (7 si es administrador). En la base de datos solo se guarda la huella del token.
 *
 * Cada sesión va unida a su dispositivo: si se borra el dispositivo (desde "Mis dispositivos",
 * al cambiar la contraseña…), esa sesión se cierra en cuanto abra otra página.
 */
import "server-only";
import { cookies, headers } from "next/headers";
import type { Rol } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { generarToken, hashToken } from "./cripto";
import { nombreDispositivo } from "./nombreDispositivo";
import { COOKIES, DIAS_CONFIANZA, MINUTOS_ENTRE_USOS, SEGUNDOS_PASE } from "./reglas";

const DIA = 24 * 60 * 60_000;

/** El token de dispositivo guardado en este navegador (o null) */
async function tokenDeEsteNavegador(): Promise<string | null> {
  return (await cookies()).get(COOKIES.dispositivo)?.value ?? null;
}

/**
 * Si este navegador es de confianza para el usuario, devuelve el id del dispositivo.
 * Si no (sin cookie, de otra persona o caducado), devuelve null.
 */
export async function dispositivoDeConfianza(usuarioId: string): Promise<string | null> {
  const token = await tokenDeEsteNavegador();
  if (!token) return null;
  const dispositivo = await db.dispositivoConfianza.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, usuarioId: true, caducaEn: true },
  });
  if (!dispositivo || dispositivo.usuarioId !== usuarioId) return null;
  if (dispositivo.caducaEn.getTime() < Date.now()) return null;
  return dispositivo.id;
}

/** El id del dispositivo de este navegador (sea de quien sea), para marcar "Este dispositivo" */
export async function idDeEsteNavegador(): Promise<string | null> {
  const token = await tokenDeEsteNavegador();
  if (!token) return null;
  const dispositivo = await db.dispositivoConfianza.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true },
  });
  return dispositivo?.id ?? null;
}

/**
 * Marca este navegador como de confianza para el usuario (después de un código correcto).
 * Devuelve el id y el nombre del dispositivo nuevo.
 */
export async function confiarEnEsteNavegador(usuario: {
  id: string;
  rol: Rol;
}): Promise<{ id: string; nombre: string }> {
  const dias = DIAS_CONFIANZA[usuario.rol];
  const token = generarToken();
  const nombre = nombreDispositivo((await headers()).get("user-agent"));

  // Si este navegador ya tenía un dispositivo (de esta u otra cuenta), lo sustituimos
  const anterior = await tokenDeEsteNavegador();
  if (anterior) {
    await db.dispositivoConfianza.deleteMany({
      where: { tokenHash: hashToken(anterior), usuarioId: usuario.id },
    });
  }

  const dispositivo = await db.dispositivoConfianza.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: hashToken(token),
      nombre,
      caducaEn: new Date(Date.now() + dias * DIA),
    },
    select: { id: true, nombre: true },
  });

  (await cookies()).set(COOKIES.dispositivo, token, {
    httpOnly: true, // el JavaScript de la página no puede leerla
    sameSite: "lax", // no se envía desde formularios de otras webs
    secure: process.env.NODE_ENV === "production", // solo por https en producción
    path: "/",
    maxAge: dias * 24 * 60 * 60,
  });
  return dispositivo;
}

/**
 * Crea un "pase" de un solo uso (vale 60 segundos) para iniciar sesión con este dispositivo.
 * Auth.js lo canjea por la sesión (ver src/auth.ts); así la contraseña nunca viaja dos veces.
 */
export async function crearPase(dispositivoId: string): Promise<string> {
  const pase = generarToken();
  await db.dispositivoConfianza.update({
    where: { id: dispositivoId },
    data: {
      paseHash: hashToken(pase),
      paseCaducaEn: new Date(Date.now() + SEGUNDOS_PASE * 1000),
      ultimoUsoEn: new Date(),
    },
  });
  return pase;
}

/** Canjea un pase: devuelve el usuario y su dispositivo, o null si no vale. Solo sirve una vez. */
export async function canjearPase(pase: string) {
  const paseHash = hashToken(pase);
  // findFirst: paseHash tiene índice pero no es único (MongoDB no admite varios null en un único)
  const dispositivo = await db.dispositivoConfianza.findFirst({
    where: { paseHash },
    select: {
      id: true,
      caducaEn: true,
      paseCaducaEn: true,
      usuario: {
        select: { id: true, nombre: true, email: true, rol: true, emailVerificadoEn: true },
      },
    },
  });
  if (!dispositivo) return null;

  // Lo gastamos SOLO si nadie lo ha gastado antes (por si llegan dos peticiones a la vez)
  const gastado = await db.dispositivoConfianza.updateMany({
    where: { id: dispositivo.id, paseHash },
    data: { paseHash: null, paseCaducaEn: null },
  });
  const ahora = Date.now();
  if (
    gastado.count !== 1 ||
    !dispositivo.paseCaducaEn ||
    dispositivo.paseCaducaEn.getTime() < ahora ||
    dispositivo.caducaEn.getTime() < ahora ||
    !dispositivo.usuario.emailVerificadoEn
  ) {
    return null;
  }
  return { usuario: dispositivo.usuario, dispositivoId: dispositivo.id };
}

/**
 * ¿Sigue valiendo la sesión? (la llama Auth.js cada vez que se lee la sesión)
 * Vale si el dispositivo existe, es de ese usuario, no ha caducado, el email está verificado
 * y la sesión se abrió DESPUÉS del último "Cerrar sesión" en ese navegador.
 * Devuelve el rol actual (para el menú) o null si la sesión ya no vale.
 */
export async function comprobarSesion(
  usuarioId: string,
  dispositivoId: string,
  abiertaEn = 0,
): Promise<Rol | null> {
  const dispositivo = await db.dispositivoConfianza.findUnique({
    where: { id: dispositivoId },
    select: {
      usuarioId: true,
      caducaEn: true,
      ultimoUsoEn: true,
      sesionCerradaEn: true,
      usuario: { select: { rol: true, emailVerificadoEn: true } },
    },
  });
  const ahora = Date.now();
  if (
    !dispositivo ||
    dispositivo.usuarioId !== usuarioId ||
    dispositivo.caducaEn.getTime() < ahora ||
    !dispositivo.usuario.emailVerificadoEn ||
    (dispositivo.sesionCerradaEn && abiertaEn <= dispositivo.sesionCerradaEn.getTime())
  ) {
    return null;
  }

  // Apuntamos el "último uso", como mucho una vez cada hora
  if (dispositivo.ultimoUsoEn.getTime() < ahora - MINUTOS_ENTRE_USOS * 60_000) {
    await db.dispositivoConfianza.update({
      where: { id: dispositivoId },
      data: { ultimoUsoEn: new Date(ahora) },
    });
  }
  return dispositivo.usuario.rol;
}

/**
 * "Cerrar sesión": apunta la hora en el dispositivo. Así la sesión cerrada ya no vale aunque
 * una petición que iba a la vez (la librería consulta la sesión justo al salir) intente
 * renovar su cookie. El navegador SIGUE siendo de confianza: al volver a entrar no pide código.
 */
export async function marcarSesionCerrada(usuarioId: string, dispositivoId: string) {
  await db.dispositivoConfianza.updateMany({
    where: { id: dispositivoId, usuarioId },
    data: { sesionCerradaEn: new Date() },
  });
}

/** Los dispositivos de confianza de un usuario (para "Mis dispositivos"), del más reciente al más antiguo */
export function listarDispositivos(usuarioId: string) {
  return db.dispositivoConfianza.findMany({
    where: { usuarioId, caducaEn: { gt: new Date() } },
    orderBy: { ultimoUsoEn: "desc" },
    select: { id: true, nombre: true, creadoEn: true, ultimoUsoEn: true, caducaEn: true },
  });
}

/**
 * Olvida dispositivos de un usuario (y así cierra sus sesiones).
 *   excepto → id de un dispositivo que se conserva (por ejemplo, el que está cambiando la contraseña)
 */
export async function olvidarDispositivos(usuarioId: string, excepto?: string): Promise<number> {
  const { count } = await db.dispositivoConfianza.deleteMany({
    where: { usuarioId, ...(excepto && { id: { not: excepto } }) },
  });
  return count;
}
