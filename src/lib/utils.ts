/**
 * Utilidades pequeñas que se usan en toda la web.
 */

/** Une clases CSS ignorando las vacías. Ejemplo: cn("a", activo && "b") → "a b" */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(" ");
}

const formatoEuros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

/**
 * Convierte céntimos en texto con euros. Ejemplo: 4990 → "49,90 €".
 * Guardamos los precios en céntimos (números enteros) para evitar errores de redondeo.
 * Todos los precios son con IVA incluido.
 */
export function formatearPrecio(centimos: number): string {
  return formatoEuros.format(centimos / 100);
}

const formatoNumero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

/** Escribe un número a la española. Ejemplo: 3.3 → "3,3"; 1500 → "1500" */
export function formatearNumero(numero: number): string {
  return formatoNumero.format(numero);
}

/** Elige la forma singular o plural. Ejemplo: plural(2, "pieza", "piezas") → "2 piezas" */
export function plural(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}
