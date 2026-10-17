/**
 * BÚSQUEDAS DE TEXTO QUE FUNCIONAN IGUAL EN SQLITE Y EN POSTGRESQL
 * En SQLite "contains" no distingue mayúsculas (para letras sin tilde); en PostgreSQL sí,
 * salvo que se pida mode: "insensitive" (que SQLite no admite). Esta función elige sola.
 */
import type { Prisma } from "@/generated/prisma/client";

const esPostgres = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");

/** Filtro "el texto contiene q" sin distinguir mayúsculas, en cualquier base de datos */
export function textoContiene(q: string): Prisma.StringFilter {
  return (
    esPostgres ? { contains: q, mode: "insensitive" } : { contains: q }
  ) as Prisma.StringFilter;
}
