/**
 * CUENTAS PENDIENTES DE VERIFICAR
 * Al registrarse, la cuenta se guarda enseguida, pero hasta que no se escribe el código del
 * correo (emailVerificadoEn = null) no es una cuenta de verdad: no puede entrar, no cuenta en
 * las cifras del panel y, si nadie la confirma en DIAS_CUENTA_PENDIENTE días, se borra sola.
 *
 * La limpieza no necesita ningún servicio aparte: se hace al enviar un código (registro, login…)
 * y al abrir el panel. Solo borra cuentas CLIENTE con emailVerificadoEn = null: nunca una
 * verificada ni la de un administrador.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { DIAS_CUENTA_PENDIENTE } from "./reglas";

/** Cuentas con el email confirmado (las únicas que cuentan como "registradas") */
export const USUARIO_VERIFICADO = {
  emailVerificadoEn: { not: null },
} satisfies Prisma.UsuarioWhereInput;

/** Cuentas que no han escrito el código del correo. Solo estas se pueden borrar. */
export const USUARIO_PENDIENTE = {
  emailVerificadoEn: null,
  rol: "CLIENTE",
} satisfies Prisma.UsuarioWhereInput;

/** Fecha antes de la cual una cuenta pendiente ya ha caducado */
export function limitePendientes(ahora = new Date()): Date {
  return new Date(ahora.getTime() - DIAS_CUENTA_PENDIENTE * 24 * 60 * 60_000);
}

/**
 * Borra las cuentas pendientes que cumplan "donde" (además de ser pendientes) con sus códigos
 * y dispositivos. Devuelve cuántas se han borrado.
 */
export async function borrarPendientes(donde: Prisma.UsuarioWhereInput): Promise<number> {
  const filtro = { AND: [donde, USUARIO_PENDIENTE] } satisfies Prisma.UsuarioWhereInput;
  const ids = (await db.usuario.findMany({ where: filtro, select: { id: true } })).map((u) => u.id);
  if (ids.length === 0) return 0;

  // Primero lo que cuelga de la cuenta (MongoDB no lo borra solo si no es a través de Prisma)
  await db.verificacion.deleteMany({ where: { usuarioId: { in: ids } } });
  await db.dispositivoConfianza.deleteMany({ where: { usuarioId: { in: ids } } });
  // El filtro se repite: si alguien ha confirmado su email justo ahora, su cuenta no se toca
  const { count } = await db.usuario.deleteMany({ where: { AND: [{ id: { in: ids } }, filtro] } });
  return count;
}

/** Borra las cuentas pendientes de hace más de DIAS_CUENTA_PENDIENTE días. Nunca falla. */
export async function limpiarPendientesCaducados(ahora = new Date()): Promise<number> {
  try {
    return await borrarPendientes({ creadoEn: { lt: limitePendientes(ahora) } });
  } catch (error) {
    // Si falla, ya se hará la próxima vez: no puede impedir registrarse ni abrir el panel
    console.error("No se han podido borrar las cuentas sin verificar:", error);
    return 0;
  }
}
