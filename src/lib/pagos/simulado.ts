import { randomUUID } from "node:crypto";
import type { ProveedorPago } from "./tipos";

/**
 * PAGO SIMULADO: no cobra nada. Da el pago por hecho al momento y devuelve
 * una referencia inventada que empieza por "SIM-".
 */
export const pagoSimulado: ProveedorPago = {
  id: "simulado",
  async cobrar() {
    return { estado: "pagado", referencia: `SIM-${randomUUID().slice(0, 8).toUpperCase()}` };
  },
};
