/**
 * STOCK DEL ALMACÉN (/stock): lo que hay de cada kit y de cada componente.
 * Lo ven todos los del equipo (ROLES_EQUIPO); solo un ADMIN lo cambia (la acción lo comprueba).
 * Reglas (avisos, estados, textos) en src/config/stock.ts.
 *
 * Los kits gratis (sin piezas, precio 0: el de bienvenida) no salen: no son nada físico.
 * Los ocultos sí salen (siguen ocupando sitio en el almacén), con su etiqueta.
 */
import "server-only";
import {
  estadoStock,
  minimoDe,
  ORDEN_ESTADO,
  type EstadoStock,
  type TipoProducto,
} from "@/config/stock";
import { nombreCategoria } from "@/config/categorias";
import { db, transaccion } from "@/lib/db";
import type { Categoria } from "@/generated/prisma/enums";

export interface FilaStock {
  tipo: TipoProducto;
  id: string;
  nombre: string;
  /** Categoría del componente (en un kit: «Kit») */
  grupo: string;
  imagen: string;
  unidades: number;
  /** El aviso que vale (el suyo o el de siempre) */
  minimo: number;
  /** true = tiene su propio aviso; false = usa el de siempre */
  minimoPropio: boolean;
  enReposicion: boolean;
  visible: boolean;
  estado: EstadoStock;
}

const ordenar = (a: FilaStock, b: FilaStock) =>
  ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || a.nombre.localeCompare(b.nombre, "es");

/** Todo el almacén: kits y componentes, primero lo que hay que reponer */
export async function listarStock() {
  const [kits, componentes] = await Promise.all([
    db.kit.findMany({
      where: { NOT: { precioCentimos: 0, componentes: { none: {} } } },
      select: {
        id: true,
        nombre: true,
        imagen: true,
        stock: true,
        stockMinimo: true,
        enReposicion: true,
        visible: true,
      },
    }),
    db.componente.findMany({
      select: {
        id: true,
        nombre: true,
        categoria: true,
        imagen: true,
        stock: true,
        stockMinimo: true,
        enReposicion: true,
        visible: true,
      },
    }),
  ]);

  const fila = (
    tipo: TipoProducto,
    p: (typeof kits)[number] & { categoria?: Categoria },
  ): FilaStock => {
    const minimo = minimoDe(tipo, p.stockMinimo);
    return {
      tipo,
      id: p.id,
      nombre: p.nombre,
      grupo: p.categoria ? nombreCategoria(p.categoria) : "Kit",
      imagen: p.imagen,
      unidades: p.stock,
      minimo,
      minimoPropio: p.stockMinimo !== null,
      enReposicion: p.enReposicion,
      visible: p.visible,
      estado: estadoStock(p.stock, minimo, p.enReposicion),
    };
  };

  return {
    kits: kits.map((k) => fila("kit", k)).sort(ordenar),
    componentes: componentes.map((c) => fila("componente", c)).sort(ordenar),
  };
}

/** Cuántos productos necesitan que alguien pida más (para el inicio del panel) */
export async function contarPorReponer() {
  const { kits, componentes } = await listarStock();
  return [...kits, ...componentes].filter((f) => f.estado === "agotado" || f.estado === "bajo")
    .length;
}

/** Los últimos cambios hechos a mano */
export function ultimosMovimientos(cuantos = 15) {
  return db.movimientoStock.findMany({ orderBy: { creadoEn: "desc" }, take: cuantos });
}

/**
 * Cambia las unidades, el aviso (null = el de siempre) y la casilla «Ya hemos pedido más» de un
 * producto, y lo apunta en el registro. Devuelve false si el producto no existe.
 * Si con las unidades nuevas ya pasa del aviso, la casilla se quita sola (lo pedido ha llegado).
 */
export async function cambiarStock(datos: {
  tipo: TipoProducto;
  id: string;
  unidades: number;
  minimo: number | null;
  enReposicion: boolean;
  autorNombre: string;
}): Promise<boolean> {
  return transaccion(async (tx) => {
    const seleccion = {
      nombre: true,
      stock: true,
      stockMinimo: true,
      enReposicion: true,
    } as const;
    const antes =
      datos.tipo === "kit"
        ? await tx.kit.findUnique({ where: { id: datos.id }, select: seleccion })
        : await tx.componente.findUnique({ where: { id: datos.id }, select: seleccion });
    if (!antes) return false;

    const minimo = minimoDe(datos.tipo, datos.minimo);
    const enReposicion = datos.unidades > minimo ? false : datos.enReposicion;
    const cambios = { stock: datos.unidades, stockMinimo: datos.minimo, enReposicion };
    if (datos.tipo === "kit") await tx.kit.update({ where: { id: datos.id }, data: cambios });
    else await tx.componente.update({ where: { id: datos.id }, data: cambios });

    const cambioMinimo = antes.stockMinimo !== datos.minimo;
    const cambioReposicion = antes.enReposicion !== enReposicion;
    if (antes.stock !== datos.unidades || cambioMinimo || cambioReposicion) {
      await tx.movimientoStock.create({
        data: {
          tipo: datos.tipo,
          productoId: datos.id,
          nombre: antes.nombre,
          antes: antes.stock,
          despues: datos.unidades,
          minimoAntes: cambioMinimo ? minimoDe(datos.tipo, antes.stockMinimo) : null,
          minimoDespues: cambioMinimo ? minimo : null,
          reposicion: cambioReposicion ? enReposicion : null,
          autorNombre: datos.autorNombre,
        },
      });
    }
    return true;
  });
}
