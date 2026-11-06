/**
 * CONEXIÓN CON LA BASE DE DATOS (MongoDB Atlas)
 * Crea un único "cliente" de Prisma para toda la web. La dirección sale de DATABASE_URL.
 */
import "server-only";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { extensionNulos } from "@/lib/nulos";

/** Cliente con los campos opcionales guardados como null al crear (ver src/lib/nulos.ts) */
function crearCliente() {
  return new PrismaClient().$extends(extensionNulos);
}

// En desarrollo, Next.js recarga el código a menudo. Guardamos el cliente en
// "globalThis" para no abrir una conexión nueva en cada recarga.
const globalParaPrisma = globalThis as unknown as { prisma?: ReturnType<typeof crearCliente> };

export const db = globalParaPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = db;
}

/** Cliente dentro de una transacción (lo que recibe la función de transaccion()) */
export type Tx = Omit<
  ReturnType<typeof crearCliente>,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/** Veces que se repite una transacción que choca con otra al mismo tiempo */
const REINTENTOS = 3;

/** true si MongoDB ha abortado la transacción por chocar con otra (se puede repetir sin problema) */
function esConflicto(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || /WriteConflict|TransientTransactionError/.test(error.message))
  );
}

/**
 * Ejecuta varias operaciones como UNA sola: o se hacen todas o ninguna ($transaction de Prisma).
 * En MongoDB, si dos transacciones tocan el mismo documento a la vez, una se aborta: aquí se repite
 * sola (hasta 3 veces). Las comprobaciones de dentro (stock, código sin usar…) se vuelven a hacer
 * en cada intento, así que repetirla nunca hace nada dos veces.
 */
export async function transaccion<T>(
  operaciones: (tx: Tx) => Promise<T>,
  opciones?: { timeout?: number },
): Promise<T> {
  for (let intento = 1; ; intento++) {
    try {
      // timeout: Atlas está en Internet; 15 s de margen para las transacciones con varios pasos
      return await db.$transaction(operaciones, { maxWait: 10_000, timeout: 15_000, ...opciones });
    } catch (error) {
      if (intento >= REINTENTOS || !esConflicto(error)) throw error;
      await new Promise((r) => setTimeout(r, 50 * intento + Math.random() * 50));
    }
  }
}
