/**
 * Lo que necesita cualquier "cobrador" (proveedor de pago).
 * El checkout solo habla con esta interfaz, así que cambiar de pago simulado
 * a Stripe no obliga a tocar el resto de la web.
 */

export interface DatosCobro {
  pedidoId: string;
  /** Número de pedido que ve el cliente */
  numero: string;
  email: string;
  totalCentimos: number;
  lineas: { nombre: string; precioUnitarioCentimos: number; cantidad: number }[];
  /** A dónde vuelve el cliente si el pago sale bien (solo pagos con redirección, como Stripe) */
  urlExito: string;
  /** A dónde vuelve el cliente si cancela el pago */
  urlCancelar: string;
}

export type ResultadoCobro =
  /** El pago ya está hecho (pago simulado) */
  | { estado: "pagado"; referencia: string }
  /** Hay que mandar al cliente a la página del proveedor (Stripe Checkout) */
  | { estado: "redirigir"; url: string; referencia: string };

export interface ProveedorPago {
  /** Nombre que se guarda en el pedido */
  id: "simulado" | "stripe";
  cobrar: (datos: DatosCobro) => Promise<ResultadoCobro>;
}
