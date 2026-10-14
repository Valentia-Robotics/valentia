import type { EstadoPedido as Estado } from "@/generated/prisma/enums";
import { Insignia } from "./Insignia";

const estados: Record<Estado, { texto: string; tono: "exito" | "aviso" | "error" }> = {
  PAGADO: { texto: "Pagado", tono: "exito" },
  PENDIENTE: { texto: "Pendiente", tono: "aviso" },
  CANCELADO: { texto: "Cancelado", tono: "error" },
};

/** Estado de un pedido como etiqueta de color */
export function EstadoPedido({ estado }: { estado: Estado }) {
  const { texto, tono } = estados[estado];
  return <Insignia tono={tono}>{texto}</Insignia>;
}
