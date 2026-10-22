/**
 * CUENTAS PENDIENTES DE VERIFICAR
 * Al registrarse, la cuenta se guarda enseguida, pero hasta que no se escribe el código del
 * correo (emailVerificadoEn = null) no es una cuenta de verdad: no puede entrar ni cuenta en
 * las cifras del panel.
 *
 * Nunca se borran solas (decisión del usuario): solo con el botón «Eliminar» del panel, que
 * únicamente borra cuentas CLIENTE con emailVerificadoEn = null, nunca una verificada ni un ADMIN.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** Cuentas con el email confirmado (las únicas que cuentan como "registradas") */
export const USUARIO_VERIFICADO = {
  emailVerificadoEn: { not: null },
} satisfies Prisma.UsuarioWhereInput;

/** Cuentas que no han escrito el código del correo. Solo estas se pueden borrar. */
export const USUARIO_PENDIENTE = {
  emailVerificadoEn: null,
  rol: "CLIENTE",
} satisfies Prisma.UsuarioWhereInput;

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
