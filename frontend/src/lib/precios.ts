/**
 * CÁLCULO DE TOTALES Y ZONA DE ENVÍO
 * Funciones "puras" (no leen la base de datos): las usan el carrito, el checkout,
 * el servidor al crear el pedido y los correos, así que todos calculan exactamente igual.
 * Los valores (envío, IVA, códigos postales) están en src/config/tienda.ts.
 */
import { tienda, type Provincia } from "@/config/tienda";

export interface Totales {
  /** Suma de los productos (IVA incluido) */
  subtotalCentimos: number;
  /** Gastos de envío (IVA incluido). 0 = gratis */
  envioCentimos: number;
  /** Lo que paga el cliente */
  totalCentimos: number;
  /** Total sin IVA */
  baseImponibleCentimos: number;
  /** IVA incluido en el total */
  ivaCentimos: number;
  /** Cuánto falta para el envío gratis (0 si ya lo tiene) */
  faltaEnvioGratisCentimos: number;
}

/** IVA que va dentro de un precio con IVA incluido. Ejemplo: 121 € → 21 € */
export function ivaIncluido(centimosConIva: number, porcentaje: number = tienda.ivaPorcentaje) {
  const base = Math.round((centimosConIva * 100) / (100 + porcentaje));
  return { baseCentimos: base, ivaCentimos: centimosConIva - base };
}

/** Gastos de envío para un importe de productos */
export function calcularEnvio(subtotalCentimos: number): number {
  if (subtotalCentimos <= 0) return 0;
  return subtotalCentimos >= tienda.envio.gratisDesdeCentimos ? 0 : tienda.envio.costeCentimos;
}

/** Subtotal, envío, total y desglose del IVA a partir de la suma de los productos */
export function calcularTotales(subtotalCentimos: number): Totales {
  if (!Number.isInteger(subtotalCentimos) || subtotalCentimos < 0) {
    throw new Error("El subtotal tiene que ser un número entero de céntimos");
  }
  const envioCentimos = calcularEnvio(subtotalCentimos);
  const totalCentimos = subtotalCentimos + envioCentimos;
  const { baseCentimos, ivaCentimos } = ivaIncluido(totalCentimos);
  return {
    subtotalCentimos,
    envioCentimos,
    totalCentimos,
    baseImponibleCentimos: baseCentimos,
    ivaCentimos,
    faltaEnvioGratisCentimos: Math.max(0, tienda.envio.gratisDesdeCentimos - subtotalCentimos),
  };
}

/** Provincia de un código postal de la zona de envío, o null si no enviamos allí */
export function provinciaDeCodigoPostal(codigoPostal: string): Provincia | null {
  const cp = codigoPostal.trim();
  if (!/^\d{5}$/.test(cp)) return null;
  return tienda.envio.provincias.find((p) => cp.startsWith(p.prefijoCP))?.nombre ?? null;
}

/** true si enviamos a ese código postal */
export function codigoPostalEnZona(codigoPostal: string): boolean {
  return provinciaDeCodigoPostal(codigoPostal) !== null;
}
