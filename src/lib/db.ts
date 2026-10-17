/**
 * CONEXIÓN CON LA BASE DE DATOS
 * Crea un único "cliente" de Prisma para toda la web.
 * Funciona igual con SQLite (local) y con PostgreSQL (producción): el adaptador
 * se elige solo según DATABASE_URL (ver src/lib/adaptadorBD.ts y el README).
 */
import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { crearAdaptador } from "@/lib/adaptadorBD";

function crearCliente() {
  return new PrismaClient({ adapter: crearAdaptador() });
}

// En desarrollo, Next.js recarga el código a menudo. Guardamos el cliente en
// "globalThis" para no abrir una conexión nueva en cada recarga.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalParaPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = db;
}
