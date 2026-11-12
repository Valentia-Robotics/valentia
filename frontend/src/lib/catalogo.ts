/**
 * Consultas del catálogo (kits, componentes y cursos) a la base de datos.
 * Las páginas usan estas funciones en lugar de hablar directamente con Prisma.
 */
import "server-only";
import { db } from "@/lib/db";
import { CATEGORIAS } from "@/lib/validaciones/catalogo";
import { modeloDeComponente } from "@/lib/modelos3d";
import type { ComponenteCatalogo, Especificacion, KitParaConfigurador } from "@/types/catalogo";

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

/** Los kits a la venta (los ocultos desde el panel no salen), por su "orden" */
export function obtenerKits() {
  return db.kit.findMany({
    where: { visible: true },
    orderBy: { orden: "asc" },
    include: { curso: { select: { titulo: true, _count: { select: { lecciones: true } } } } },
  });
}

/** Cifras de la portada: kits y componentes a la venta y lecciones de sus cursos */
export async function obtenerCifras() {
  const [kits, componentes, lecciones] = await Promise.all([
    db.kit.count({ where: { visible: true, precioCentimos: { gt: 0 } } }),
    db.componente.count({ where: { visible: true } }),
    db.leccion.count({ where: { curso: { kit: { visible: true } } } }),
  ]);
  return { kits, componentes, lecciones };
}

/** Un kit a la venta con todos sus detalles, o null si no existe o está oculto */
export async function obtenerKitPorSlug(slug: string) {
  const kit = await db.kit.findFirst({
    where: { slug, visible: true },
    include: incluirDetalleKit,
  });
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

/** Convierte el campo JSON "especificaciones" en una lista de pares nombre/valor */
export function listaDeEspecificaciones(valor: unknown): Especificacion[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(
    (v): v is Especificacion => typeof v?.nombre === "string" && typeof v?.valor === "string",
  );
}

/**
 * Los componentes a la venta (los ocultos desde el panel no salen), ordenados por categoría
 * (como en el configurador) y, dentro de cada categoría, del más barato al más caro.
 */
export async function obtenerComponentes(): Promise<ComponenteCatalogo[]> {
  const filas = await db.componente.findMany({
    where: { visible: true },
    orderBy: { precioCentimos: "asc" },
  });
  const posicion = (c: string) => CATEGORIAS.indexOf(c as (typeof CATEGORIAS)[number]);
  return filas.sort((a, b) => posicion(a.categoria) - posicion(b.categoria)).map(componenteDeFila);
}

type FilaComponente = Awaited<ReturnType<typeof db.componente.findFirstOrThrow>>;

/** Copia "plana" de la fila de la BD, lista para enviar al navegador */
function componenteDeFila(fila: FilaComponente): ComponenteCatalogo {
  return {
    slug: fila.slug,
    nombre: fila.nombre,
    categoria: fila.categoria,
    tipo: fila.tipo,
    resumen: fila.resumen,
    descripcion: fila.descripcion,
    precioCentimos: fila.precioCentimos,
    stock: fila.stock,
    enReposicion: fila.enReposicion,
    imagen: fila.imagen,
    voltaje: fila.voltaje,
    voltajeLogico: fila.voltajeLogico,
    voltajeLogicoMin: fila.voltajeLogicoMin,
    consumoMa: fila.consumoMa,
    conector: fila.conector,
    pines: fila.pines,
    especificaciones: listaDeEspecificaciones(fila.especificaciones),
    modelo3d: modeloDeComponente(fila.slug),
  };
}

/**
 * Un componente a la venta con los kits (a la venta) que lo llevan, o null si no existe o está
 * oculto. Para su ficha en /componentes/[slug].
 */
export async function obtenerComponentePorSlug(slug: string) {
  const fila = await db.componente.findFirst({
    where: { slug, visible: true },
    include: {
      enKits: {
        where: { kit: { visible: true } },
        include: { kit: { select: { slug: true, nombre: true, eslogan: true, imagen: true } } },
      },
    },
  });
  if (!fila) return null;
  return {
    ...componenteDeFila(fila),
    kits: fila.enKits.map((k) => ({ ...k.kit, cantidad: k.cantidad })),
  };
}

/**
 * Los kits con su lista de piezas, para "empezar desde un kit" en el configurador.
 * Solo las piezas que están a la venta: un componente oculto no se puede añadir suelto.
 */
export async function obtenerKitsParaConfigurador(): Promise<KitParaConfigurador[]> {
  const kits = await db.kit.findMany({
    where: { visible: true },
    orderBy: { orden: "asc" },
    include: {
      componentes: {
        where: { componente: { visible: true } },
        include: { componente: { select: { slug: true } } },
      },
    },
  });
  // Un kit sin piezas (los gratis) no sirve de punto de partida para montar un robot
  return kits
    .filter((kit) => kit.componentes.length > 0)
    .map((kit) => ({
      slug: kit.slug,
      nombre: kit.nombre,
      eslogan: kit.eslogan,
      imagen: kit.imagen,
      precioCentimos: kit.precioCentimos,
      piezas: kit.componentes.map((c) => ({ slug: c.componente.slug, cantidad: c.cantidad })),
    }));
}
