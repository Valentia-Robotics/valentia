/**
 * BORRAR PEDIDOS DEL PANEL (petición de Jesse, 13-11-2026)
 * Reglas puras (sin base de datos) para decidir qué pedidos se pueden borrar y qué pasa con su
 * stock. Sirven para quitar de la lista los pedidos de prueba (pago simulado o Stripe en modo prueba).
 */
import type { EstadoPedido } from "@/generated/prisma/enums";

/** Lo que hace falta saber de un pedido para decidir */
export interface PedidoParaBorrar {
  cobroReal: boolean;
}

/**
 * Por qué NO se puede borrar este pedido (o null si se puede).
 * Un pedido cobrado de verdad cuenta en Finanzas y es un justificante de venta: se cancela, no se borra.
 */
export function motivoNoBorrarPedido(pedido: PedidoParaBorrar): string | null {
  if (pedido.cobroReal) {
    return "Este pedido se cobró de verdad: cuenta en Finanzas y hay que guardarlo. Si no sigue adelante, cancélalo.";
  }
  return null;
}

/**
 * ¿Hay que devolver sus piezas al almacén al borrarlo?
 * Sí mientras el pedido las tiene apartadas (aún no ha salido). Un pedido cancelado ya las devolvió,
 * y uno enviado o entregado ya no las tiene en el almacén.
 */
export function devuelveStockAlBorrar(estado: EstadoPedido): boolean {
  return estado === "PENDIENTE" || estado === "PAGADO" || estado === "PREPARANDO";
}
