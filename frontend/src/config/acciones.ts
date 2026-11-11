/**
 * ACCIONES DE LA EMPRESA (reglas puras; las prueba acciones.test.ts)
 * Cuántas acciones (participaciones) hay, de quién son y cuánto vale cada una según lo que
 * valga la empresa. Página: /admin/acciones (solo ADMIN y SIGMA).
 *
 * El reparto es FIJO (decisión del usuario, 11-11-2026): para cambiarlo, cambiar esta lista.
 */
import { tienda } from "./tienda";

/** Número total de acciones (S.L. con 3.000 € de capital = 3.000 participaciones de 1 €) */
export const TOTAL_ACCIONES = 3000;

export interface Socio {
  nombre: string;
  /** Porcentaje de la empresa (entre todos, 100) */
  porcentaje: number;
}

export const SOCIOS: readonly Socio[] = [
  { nombre: "Diego", porcentaje: 50 },
  { nombre: "Jesse", porcentaje: 49 },
  { nombre: "Alonso", porcentaje: 1 },
];

/** Acciones que tiene quien posee ese porcentaje (50 % de 3.000 → 1.500) */
export const accionesDe = (porcentaje: number, total = TOTAL_ACCIONES) =>
  Math.round((total * porcentaje) / 100);

/** Valor de UNA acción, en céntimos (puede tener decimales: 10.000 € / 3.000 = 333,33… céntimos) */
export const valorAccion = (valorEmpresaCentimos: number, total = TOTAL_ACCIONES) =>
  total > 0 ? valorEmpresaCentimos / total : 0;

export interface FilaSocio extends Socio {
  acciones: number;
  /** Lo que valen todas sus acciones, en céntimos (redondeado) */
  valorCentimos: number;
}

/** Reparto del valor de la empresa entre los socios */
export function repartoSocios(
  valorEmpresaCentimos: number,
  socios: readonly Socio[] = SOCIOS,
  total = TOTAL_ACCIONES,
): FilaSocio[] {
  const porAccion = valorAccion(valorEmpresaCentimos, total);
  return socios.map((s) => {
    const acciones = accionesDe(s.porcentaje, total);
    return { ...s, acciones, valorCentimos: Math.round(porAccion * acciones) };
  });
}

/** Precio con IVA → sin IVA (el IVA no es de la empresa) */
export const sinIva = (centimos: number, porcentaje = tienda.ivaPorcentaje) =>
  Math.round(centimos / (1 + porcentaje / 100));

export interface ValorCalculado {
  /** Ingresos − gastos de siempre, sin IVA (Finanzas, «Todo») */
  beneficioAcumulado: number;
  /** Kits y componentes del almacén a precio de venta sin IVA */
  valorStock: number;
  total: number;
}

/** Valor «según los números»: lo que ha ganado la empresa + lo que tiene en el almacén */
export function valorCalculado(
  beneficioAcumuladoSinIva: number,
  stock: { precioCentimos: number; stock: number }[],
): ValorCalculado {
  const valorStock = stock.reduce(
    (suma, p) => suma + sinIva(p.precioCentimos) * Math.max(0, p.stock),
    0,
  );
  return {
    beneficioAcumulado: beneficioAcumuladoSinIva,
    valorStock,
    total: beneficioAcumuladoSinIva + valorStock,
  };
}

/** Céntimos con más precisión que formatearPrecio (para el valor de una acción): 333,333 → "3,3333 €" */
export function formatearValorAccion(centimos: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(centimos / 100);
}
