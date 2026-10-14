/**
 * PAGOS
 * Elige el "cobrador" según la variable PAGOS_PROVEEDOR del archivo .env:
 *   "simulado" (por defecto) → no cobra nada, ideal para probar
 *   "stripe"                 → cobro real (ver stripe.ts para activarlo)
 */
import "server-only";
import { pagoSimulado } from "./simulado";
import { pagoStripe } from "./stripe";
import type { ProveedorPago } from "./tipos";

export function obtenerProveedorPago(): ProveedorPago {
  return process.env.PAGOS_PROVEEDOR === "stripe" ? pagoStripe : pagoSimulado;
}

export type { DatosCobro, ProveedorPago, ResultadoCobro } from "./tipos";
