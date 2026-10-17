/**
 * CORREOS DE LOS PEDIDOS
 *   - Confirmación (al confirmarse el pago): resumen, envío e IVA desglosado. Solo una vez.
 *   - Pedido enviado (al pasar a ENVIADO desde el panel): con el número de seguimiento.
 * Un correo que no sale no rompe nada: se apunta en la terminal (ver src/lib/correo).
 */
import "server-only";
import { tienda } from "@/config/tienda";
import { enviarCorreo } from "@/lib/correo";
import { plantillaPedidoConfirmado, plantillaPedidoEnviado } from "@/lib/correo/plantillas";
import { obtenerPedido, reservarCorreoConfirmacion, urlPedido } from "@/lib/pedidos";
import { formatearTelefono } from "@/lib/validaciones/pedido";

export async function enviarConfirmacionPedido(pedidoId: string): Promise<void> {
  // Si Stripe repite el aviso, el correo no se manda dos veces
  if (!(await reservarCorreoConfirmacion(pedidoId))) return;
  const pedido = await obtenerPedido(pedidoId);
  if (!pedido) return;

  await enviarCorreo(
    plantillaPedidoConfirmado({
      para: pedido.email,
      nombre: pedido.nombre.split(" ")[0],
      numero: pedido.numero,
      url: urlPedido(pedido.id, true),
      lineas: pedido.lineas,
      subtotalCentimos: pedido.subtotalCentimos,
      envioCentimos: pedido.envioCentimos,
      ivaCentimos: pedido.ivaCentimos,
      totalCentimos: pedido.totalCentimos,
      ivaPorcentaje: tienda.ivaPorcentaje,
      direccion: [
        pedido.nombre,
        pedido.direccion,
        `${pedido.codigoPostal} ${pedido.ciudad} (${pedido.provincia})`,
        pedido.telefono ? `Tel. ${formatearTelefono(pedido.telefono)}` : "",
      ].filter(Boolean),
      llevaKits: pedido.lineas.some((l) => l.tipo === "KIT"),
    }),
  );
}

export async function enviarAvisoEnvio(pedidoId: string): Promise<void> {
  const pedido = await obtenerPedido(pedidoId);
  if (!pedido) return;
  await enviarCorreo(
    plantillaPedidoEnviado({
      para: pedido.email,
      nombre: pedido.nombre.split(" ")[0],
      numero: pedido.numero,
      url: urlPedido(pedido.id, true),
      numeroSeguimiento: pedido.numeroSeguimiento,
    }),
  );
}
