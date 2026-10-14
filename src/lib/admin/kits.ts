/**
 * KITS (panel): consultas para la lista y el formulario.
 */
import "server-only";
import { db } from "@/lib/db";

/** Todos los kits (también los ocultos) con sus cifras de ventas y códigos */
export async function listarKitsAdmin() {
  const [kits, vendidos] = await Promise.all([
    db.kit.findMany({
      orderBy: { orden: "asc" },
      select: {
        id: true,
        slug: true,
        nombre: true,
        imagen: true,
        precioCentimos: true,
        visible: true,
        destacado: true,
        curso: { select: { id: true, titulo: true } },
        _count: { select: { componentes: true, codigos: true } },
      },
    }),
    // Unidades vendidas de cada kit (pedidos pagados). Los pedidos guardan el slug del kit.
    db.lineaPedido.groupBy({
      by: ["slug"],
      where: { tipo: "KIT", pedido: { estado: "PAGADO" } },
      _sum: { cantidad: true },
    }),
  ]);
  const porSlug = new Map(vendidos.map((v) => [v.slug, v._sum.cantidad ?? 0]));
  return kits.map((kit) => ({ ...kit, vendidos: porSlug.get(kit.slug) ?? 0 }));
}

export function obtenerKitAdmin(id: string) {
  return db.kit.findUnique({
    where: { id },
    include: {
      componentes: { select: { componenteId: true, cantidad: true } },
      _count: { select: { codigos: true } },
    },
  });
}

/** Todos los componentes, para elegir las piezas de un kit */
export function componentesParaKits() {
  return db.componente.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      categoria: true,
      imagen: true,
      precioCentimos: true,
      visible: true,
    },
  });
}

/**
 * Cursos que se pueden asociar a un kit: los que no tienen kit todavía
 * (cada curso va con un solo kit) y, al editar, el del propio kit.
 */
export function cursosLibres(kitId?: string) {
  return db.curso.findMany({
    where: { OR: [{ kit: null }, ...(kitId ? [{ kit: { id: kitId } }] : [])] },
    orderBy: { titulo: "asc" },
    select: { id: true, titulo: true },
  });
}

/** Cuántas unidades de un kit se han pedido alguna vez (en cualquier estado) */
export function unidadesPedidas(slug: string) {
  return db.lineaPedido.count({ where: { tipo: "KIT", slug } });
}
