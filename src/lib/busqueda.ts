/**
 * BÚSQUEDAS DE TEXTO SIN DISTINGUIR MAYÚSCULAS
 * En MongoDB "contains" distingue mayúsculas salvo que se pida mode: "insensitive".
 */
import type { Prisma } from "@/generated/prisma/client";

/** Filtro "el texto contiene q" sin distinguir mayúsculas */
export function textoContiene(q: string): Prisma.StringFilter {
  return { contains: q, mode: "insensitive" };
}
