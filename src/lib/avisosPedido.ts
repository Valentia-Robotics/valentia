/**
 * CORREOS DE LOS PEDIDOS
 *   - Confirmación (al confirmarse el pago): resumen, envío e IVA desglosado. Solo una vez.
 *   - Aviso a la tienda (a la vez que la confirmación): qué preparar y adónde enviarlo. Va a
 *     AVISO_PEDIDOS_EMAIL (uno o varios separados por comas) o, si está vacío, a los administradores.
 *   - Pedido enviado (al pasar a ENVIADO desde el panel): con el número de seguimiento.
 * Un correo que no sale no rompe nada: se apunta en la terminal (ver src/lib/correo).
 */
import "server-only";
import { tienda } from "@/config/tienda";
import { enviarCorreo } from "@/lib/correo";
import { db } from "@/lib/db";
import {
  plantillaPedidoConfirmado,
  plantillaPedidoEnviado,
  plantillaPedidoNuevoTienda,
} from "@/lib/correo/plantillas";
import {
  obtenerPedido,
  piezasDeLinea,
  reservarCorreoConfirmacion,
  urlPedido,
  type PedidoCompleto,
} from "@/lib/pedidos";
import { formatearTelefono } from "@/lib/validaciones/pedido";

export async function enviarConfirmacionPedido(pedidoId: string): Promise<void> {
  // Si Stripe repite el aviso, el correo no se manda dos veces
  if (!(await reservarCorreoConfirmacion(pedidoId))) return;
  const pedido = await obtenerPedido(pedidoId);
  if (!pedido) return;

  const direccion = [
    pedido.nombre,
    pedido.direccion,
    `${pedido.codigoPostal} ${pedido.ciudad} (${pedido.provincia})`,
    pedido.telefono ? `Tel. ${formatearTelefono(pedido.telefono)}` : "",
  ].filter(Boolean);

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
      direccion,
      llevaKits: pedido.lineas.some((l) => l.tipo === "KIT"),
    }),
  );
  await avisarTienda(pedido, direccion);
}

/** Quién recibe el aviso de pedido nuevo: AVISO_PEDIDOS_EMAIL o, si no está, los administradores */
async function destinatariosTienda(): Promise<string[]> {
  const configurados = (process.env.AVISO_PEDIDOS_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (configurados.length) return configurados;
  const admins = await db.usuario.findMany({ where: { rol: "ADMIN" }, select: { email: true } });
  return admins.map((a) => a.email);
}

async function avisarTienda(pedido: PedidoCompleto, direccion: string[]): Promise<void> {
  const destinatarios = await destinatariosTienda();
  if (!destinatarios.length) {
    console.warn(
      `Pedido ${pedido.numero} pagado, pero no hay a quién avisar (ni AVISO_PEDIDOS_EMAIL ni administradores).`,
    );
    return;
  }
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  for (const para of destinatarios) {
    await enviarCorreo(
      plantillaPedidoNuevoTienda({
        para,
        numero: pedido.numero,
        totalCentimos: pedido.totalCentimos,
        lineas: pedido.lineas.map((l) => ({
          texto: `${l.cantidad} × ${l.nombre}`,
          piezas: piezasDeLinea(l.piezas).map((p) => `${p.cantidad} × ${p.nombre}`),
        })),
        cliente: {
          nombre: pedido.nombre,
          email: pedido.email,
          telefono: pedido.telefono ? formatearTelefono(pedido.telefono) : "",
        },
        direccion,
        codigos: pedido.codigos.map((c) => c.codigo),
        url: `${base}/admin/pedidos/${pedido.id}`,
      }),
    );
  }
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
