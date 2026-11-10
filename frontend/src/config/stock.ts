/**
 * STOCK: cuándo hay que reponer y cómo se dice.
 * Reglas puras (sin base de datos), las usan /stock y el inicio del panel. Test: stock.test.ts.
 *
 * Cada kit y cada componente puede tener su propio aviso («avisar con 5 o menos»); si no tiene,
 * se usa el de siempre de aquí abajo (decisión de Jesse: 2-3 kits, 10 componentes).
 */

/** Aviso de siempre: con estas unidades o menos, hay que pedir más */
export const MINIMO_POR_DEFECTO = { kit: 3, componente: 10 } as const;

export type TipoProducto = keyof typeof MINIMO_POR_DEFECTO;

/** Máximos que se pueden escribir en el panel (para que un dedo de más no ponga un millón) */
export const MAXIMO_UNIDADES = 100_000;
export const MAXIMO_AVISO = 10_000;

/**
 *   agotado → 0 unidades y nada pedido: «Reposición necesaria»
 *   bajo    → quedan, pero en el aviso o por debajo, y nada pedido: «Stock bajo»
 *   pedido  → 0 o pocas, pero ya se ha pedido más («Ya hemos pedido más» marcado): «Reposición en curso»
 *   ok      → por encima del aviso: «Stock suficiente»
 */
export type EstadoStock = "agotado" | "bajo" | "pedido" | "ok";

export const ESTADOS_STOCK: Record<
  EstadoStock,
  { nombre: string; detalle: string; tono: "error" | "aviso" | "acento" | "exito" }
> = {
  agotado: {
    nombre: "Reposición necesaria",
    detalle: "No queda ninguna unidad y aún no se ha pedido más.",
    tono: "error",
  },
  bajo: {
    nombre: "Stock bajo",
    detalle: "Quedan pocas unidades: conviene hacer un pedido pronto.",
    tono: "aviso",
  },
  pedido: {
    nombre: "Reposición en curso",
    detalle: "Ya se han pedido más unidades; falta que lleguen.",
    tono: "acento",
  },
  ok: { nombre: "Stock suficiente", detalle: "Hay unidades de sobra por ahora.", tono: "exito" },
};

/** El aviso que vale para un producto: el suyo o, si no tiene, el de siempre */
export const minimoDe = (tipo: TipoProducto, propio: number | null | undefined) =>
  propio ?? MINIMO_POR_DEFECTO[tipo];

export function estadoStock(unidades: number, minimo: number, enReposicion = false): EstadoStock {
  if (unidades > minimo && unidades > 0) return "ok";
  if (enReposicion) return "pedido";
  return unidades <= 0 ? "agotado" : "bajo";
}

/** Cuántas unidades harían falta para salir del aviso (para la frase «Pedir al menos N») */
export const faltanParaMinimo = (unidades: number, minimo: number) =>
  Math.max(0, minimo + 1 - Math.max(0, unidades));

/** Orden de la lista: primero lo que hay que reponer, luego lo bajo y al final lo que va bien */
export const ORDEN_ESTADO: Record<EstadoStock, number> = { agotado: 0, bajo: 1, pedido: 2, ok: 3 };

/** Lee un número entero del formulario dentro de unos límites (null si no vale) */
export function leerEntero(valor: unknown, maximo: number): number | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!/^\d+$/.test(limpio)) return null;
  const numero = Number(limpio);
  return numero <= maximo ? numero : null;
}

/**
 * Lo que ve el cliente en la tienda (Jesse: «sin stock» y «en reposición» no son lo mismo):
 *   quedan unidades          → «En stock»
 *   0 y ya hemos pedido más  → «En reposición» (vuelve pronto)
 *   0 y no hay nada pedido   → «Sin stock»
 * Con 0 no se puede comprar en ningún caso.
 */
export function textoTienda(unidades: number, enReposicion: boolean) {
  if (unidades > 0) return "En stock";
  return enReposicion ? "En reposición" : "Sin stock";
}
