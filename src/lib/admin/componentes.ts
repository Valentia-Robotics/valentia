/**
 * COMPONENTES (panel): consultas para la lista y el formulario.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Categoria } from "@/generated/prisma/enums";
import { reglas } from "@/lib/compatibilidad/reglas";
import type { Selector } from "@/lib/compatibilidad/tipos";
import { db } from "@/lib/db";
import { CATEGORIAS } from "@/lib/validaciones/catalogo";

/** Componentes que coinciden con la búsqueda y la categoría, ordenados como en la tienda */
export async function listarComponentesAdmin(busqueda: string, categoria?: Categoria) {
  const q = busqueda.trim();
  const where: Prisma.ComponenteWhereInput = {
    ...(categoria && { categoria }),
    ...(q && {
      OR: [
        { nombre: { contains: q } },
        { slug: { contains: q.toLowerCase() } },
        { tipo: { contains: q.toLowerCase() } },
      ],
    }),
  };
  const filas = await db.componente.findMany({
    where,
    orderBy: [{ nombre: "asc" }],
    select: {
      id: true,
      slug: true,
      nombre: true,
      categoria: true,
      tipo: true,
      precioCentimos: true,
      stock: true,
      imagen: true,
      visible: true,
      _count: { select: { enKits: true } },
    },
  });
  const posicion = (c: string) => CATEGORIAS.indexOf(c as Categoria);
  return filas.sort((a, b) => posicion(a.categoria) - posicion(b.categoria));
}

export function obtenerComponenteAdmin(id: string) {
  return db.componente.findUnique({
    where: { id },
    include: { enKits: { select: { kit: { select: { id: true, nombre: true } } } } },
  });
}

export type ComponenteAdmin = NonNullable<Awaited<ReturnType<typeof obtenerComponenteAdmin>>>;

/**
 * Tipos de pieza que se pueden elegir en el formulario: los que ya usan los componentes
 * y los que aparecen en las reglas de compatibilidad (src/lib/compatibilidad/reglas.ts).
 * Las reglas solo reconocen una pieza por su tipo, así que conviene reutilizarlos.
 */
export async function tiposDePieza(): Promise<{ tipo: string; enReglas: boolean }[]> {
  const deReglas = new Set<string>();
  const anadir = (selector?: Selector) => {
    selector?.tipos?.forEach((t) => deReglas.add(t));
    selector?.excepto?.forEach((t) => deReglas.add(t));
  };
  for (const regla of reglas) {
    if (regla.tipo === "necesita") [regla.si, regla.necesita].forEach(anadir);
    if (regla.tipo === "maximo") anadir(regla.si);
    if (regla.tipo === "voltaje") [regla.piezas, regla.fuente].forEach(anadir);
    if (regla.tipo === "capacidad") [regla.proveedor, regla.consumidor].forEach(anadir);
  }
  const usados = await db.componente.findMany({ distinct: ["tipo"], select: { tipo: true } });
  const todos = new Set([...deReglas, ...usados.map((u) => u.tipo)]);
  return [...todos].sort().map((tipo) => ({ tipo, enReglas: deReglas.has(tipo) }));
}
