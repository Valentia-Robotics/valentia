/**
 * Estados de un pedido: nombre, explicación para el cliente y a qué estados se puede pasar
 * desde el panel. PENDIENTE → PAGADO solo lo hace el pago confirmado (nunca el panel).
 */
import type { EstadoPedido } from "@/generated/prisma/enums";

export const estadosPedido: Record<
  EstadoPedido,
  { nombre: string; cliente: string; tono: "exito" | "aviso" | "error" | "neutro" }
> = {
  PENDIENTE: {
    nombre: "Pendiente de pago",
    cliente: "Estamos esperando la confirmación del pago.",
    tono: "aviso",
  },
  PAGADO: {
    nombre: "Pagado",
    cliente: "Hemos recibido tu pago. Pronto empezaremos a prepararlo.",
    tono: "exito",
  },
  PREPARANDO: {
    nombre: "Preparando",
    cliente: "Estamos preparando tu caja con mucho cuidado.",
    tono: "neutro",
  },
  ENVIADO: {
    nombre: "Enviado",
    cliente: "Tu pedido va de camino.",
    tono: "neutro",
  },
  ENTREGADO: {
    nombre: "Entregado",
    cliente: "¡Entregado! A construir.",
    tono: "exito",
  },
  CANCELADO: {
    nombre: "Cancelado",
    cliente: "Este pedido está cancelado.",
    tono: "error",
  },
};

/** Pasos que ve el cliente en la línea de tiempo de su pedido */
export const pasosPedido: EstadoPedido[] = ["PAGADO", "PREPARANDO", "ENVIADO", "ENTREGADO"];

/** A qué estados se puede pasar desde el panel, según el estado actual */
export const transicionesPanel: Record<EstadoPedido, EstadoPedido[]> = {
  PENDIENTE: ["CANCELADO"],
  PAGADO: ["PREPARANDO", "ENVIADO", "CANCELADO"],
  PREPARANDO: ["ENVIADO", "CANCELADO"],
  ENVIADO: ["ENTREGADO"],
  ENTREGADO: [],
  CANCELADO: [],
};
