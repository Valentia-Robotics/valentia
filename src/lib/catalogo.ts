/**
 * Consultas del catálogo (kits, componentes y cursos) a la base de datos.
 * Las páginas usan estas funciones en lugar de hablar directamente con Prisma.
 */
import "server-only";
import { db } from "@/lib/db";
import { CATEGORIAS } from "@/lib/validaciones/catalogo";

/** Los kits que se muestran juntos con su curso y sus componentes */
const incluirDetalleKit = {
  curso: {
    include: {
      lecciones: {
        orderBy: { orden: "asc" as const },
        select: { slug: true, titulo: true, duracionMin: true, orden: true },
      },
    },
  },
  componentes: { include: { componente: true } },
};

/** Todos los kits, en el orden indicado en data/kits.json */
export function obtenerKits() {
  return db.kit.findMany({
    orderBy: { orden: "asc" },
    include: { curso: { select: { titulo: true, _count: { select: { lecciones: true } } } } },
  });
}

/** Un kit con todos sus detalles, o null si no existe */
export async function obtenerKitPorSlug(slug: string) {
  const kit = await db.kit.findUnique({ where: { slug }, include: incluirDetalleKit });
  if (!kit) return null;
  // Ordenamos las piezas por categoría (placas, motores, sensores…) como en el configurador
  const posicion = (c: string) => CATEGORIAS.indexOf(c as (typeof CATEGORIAS)[number]);
  kit.componentes.sort(
    (a, b) => posicion(a.componente.categoria) - posicion(b.componente.categoria),
  );
  return kit;
}

export type KitConDetalle = NonNullable<Awaited<ReturnType<typeof obtenerKitPorSlug>>>;
export type KitResumen = Awaited<ReturnType<typeof obtenerKits>>[number];

/** Convierte un campo JSON con una lista de textos en string[] (o lista vacía) */
export function listaDeTextos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
}
