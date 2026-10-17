/**
 * ADAPTADOR DE LA BASE DE DATOS
 * Elige cómo se conecta Prisma según la dirección de DATABASE_URL:
 *   file:./prisma/dev.db           → SQLite (en tu ordenador)
 *   postgresql://usuario:…@host/bd → PostgreSQL (en producción)
 * Lo usan src/lib/db.ts, prisma/seed.ts y scripts/hacer-admin.ts.
 * (El esquema que se usa también cambia solo: ver prisma.config.ts.)
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

export function esPostgres(url: string | undefined = process.env.DATABASE_URL): boolean {
  return /^postgres(ql)?:\/\//.test(url ?? "");
}

export function crearAdaptador(url: string | undefined = process.env.DATABASE_URL) {
  if (!url) throw new Error("Falta DATABASE_URL en el archivo .env (mira .env.example).");
  return esPostgres(url)
    ? new PrismaPg({ connectionString: url })
    : new PrismaBetterSqlite3({ url });
}
