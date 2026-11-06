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

/** Precio de un kit: los de 0 € se anuncian como «Gratis» */
export function precioDeKit(centimos: number): string {
  return centimos === 0 ? "Gratis" : formatearPrecio(centimos);
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

const formatoRelativo = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });

/** Cuánto hace de una fecha, en palabras. Ejemplo: "hace 5 minutos", "ayer", "hace 3 días" */
export function haceCuanto(fecha: Date, ahora = Date.now()): string {
  const segundos = Math.round((fecha.getTime() - ahora) / 1000);
  const unidades: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 24 * 3600],
    ["month", 30 * 24 * 3600],
    ["day", 24 * 3600],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unidad, tamano] of unidades) {
    if (Math.abs(segundos) >= tamano) {
      return formatoRelativo.format(Math.round(segundos / tamano), unidad);
    }
  }
  return "ahora mismo";
}
