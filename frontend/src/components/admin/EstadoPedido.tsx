import { estadosPedido } from "@/config/estadosPedido";
import type { EstadoPedido as Estado } from "@/generated/prisma/enums";
import { Insignia } from "./Insignia";

/** Estado de un pedido como etiqueta de color (los nombres están en src/config/estadosPedido.ts) */
export function EstadoPedido({ estado }: { estado: Estado }) {
  const { nombre, tono } = estadosPedido[estado];
  return <Insignia tono={tono}>{nombre}</Insignia>;
}
