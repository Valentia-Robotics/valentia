/**
 * CONEXIÓN CON LA BASE DE DATOS
 * Crea un único "cliente" de Prisma para toda la web.
 *
 * ─── Para pasar a PostgreSQL en producción ───
 *   1. En prisma/schema.prisma cambia  provider = "sqlite"  por  provider = "postgresql".
 *   2. Instala el adaptador:  npm install @prisma/adapter-pg
 *   3. Aquí abajo (y también en prisma/seed.ts) cambia las líneas marcadas con  ← SQLite  por:
 *        import { PrismaPg } from "@prisma/adapter-pg";
 *        const adaptador = new PrismaPg({ connectionString: process.env.DATABASE_URL });
 *   4. Pon la URL de PostgreSQL en DATABASE_URL y crea las migraciones de nuevo (ver README).
 */
import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"; // ← SQLite
import { PrismaClient } from "@/generated/prisma/client";

function crearCliente() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL en el archivo .env (mira .env.example).");
  }
  const adaptador = new PrismaBetterSqlite3({ url }); // ← SQLite
  return new PrismaClient({ adapter: adaptador });
}

// En desarrollo, Next.js recarga el código a menudo. Guardamos el cliente en
// "globalThis" para no abrir una conexión nueva en cada recarga.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalParaPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = db;
}
