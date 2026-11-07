/**
 * WEBHOOK DE STRIPE: POST /api/pagos/stripe
 * Stripe llama aquí cuando cambia un pago. Es lo ÚNICO que marca un pedido de Stripe como
 * pagado (nunca lo que diga el navegador del cliente).
 *
 *   1. Comprueba la firma con STRIPE_WEBHOOK_SECRET: si no viene de Stripe, 400.
 *   2. Idempotente: cada evento se apunta en EventoStripe; si llega repetido, se ignora.
 *      Además marcarPedidoPagado() solo cambia el pedido una vez aunque lleguen dos a la vez.
 *   3. payment_intent.succeeded → comprueba importe y moneda → PAGADO, códigos y correo.
 *      payment_intent.canceled  → cancela el pedido y devuelve el stock.
 *
 * Para probarlo en local: stripe listen --forward-to localhost:3000/api/pagos/stripe (ver README).
 */
import type Stripe from "stripe";
import { enviarConfirmacionPedido } from "@/lib/avisosPedido";
import { leerCuerpo } from "@/lib/cuerpoLimitado";
import { db } from "@/lib/db";
import { cancelarPedido, marcarPedidoPagado } from "@/lib/pedidos";
import { verificarEvento } from "@/lib/pagos/stripe";

export async function POST(peticion: Request) {
  const firma = peticion.headers.get("stripe-signature");
  if (!firma) return new Response("Petición no válida", { status: 400 });
  // El cuerpo TAL CUAL: la firma se calcula sobre él. Con tope, porque aún no se sabe quién llama
  const cuerpo = await leerCuerpo(peticion, 1_000_000);
  if (cuerpo === null) return new Response("Petición no válida", { status: 400 });

  let evento: Stripe.Event;
  try {
    evento = verificarEvento(cuerpo, firma);
  } catch (error) {
    console.warn("Webhook de Stripe con firma no válida:", (error as Error).message);
    return new Response("Firma no válida", { status: 400 });
  }

  // ¿Ya lo habíamos procesado? (Stripe reintenta los avisos)
  if (await db.eventoStripe.findUnique({ where: { id: evento.id } })) {
    return Response.json({ recibido: true, repetido: true });
  }

  try {
    await procesar(evento);
  } catch (error) {
    // 500: Stripe lo volverá a intentar más tarde
    console.error(`Error procesando el evento ${evento.id} (${evento.type}):`, error);
    return new Response("Error interno", { status: 500 });
  }

  // Lo apuntamos al final: si algo falla antes, el reintento de Stripe lo procesa de nuevo
  // (todo lo de procesar() se puede repetir sin efectos dobles).
  await db.eventoStripe.create({ data: { id: evento.id, tipo: evento.type } }).catch(() => {}); // si otro aviso igual lo apuntó a la vez, no pasa nada
  return Response.json({ recibido: true });
}

async function procesar(evento: Stripe.Event) {
  if (evento.type !== "payment_intent.succeeded" && evento.type !== "payment_intent.canceled") {
    return; // el resto de avisos no nos interesan
  }
  const intento = evento.data.object;
  const pedidoId = intento.metadata?.pedidoId;
  if (!pedidoId) return;

  const pedido = await db.pedido.findUnique({
    where: { id: pedidoId },
    select: { id: true, numero: true, totalCentimos: true, referenciaPago: true },
  });
  if (!pedido || pedido.referenciaPago !== intento.id) {
    console.warn(`Aviso de Stripe para un pedido desconocido o con otro pago (${pedidoId}).`);
    return;
  }

  if (evento.type === "payment_intent.canceled") {
    await cancelarPedido(pedido.id);
    return;
  }

  // Importe y moneda tienen que ser exactamente los del pedido
  if (intento.amount_received !== pedido.totalCentimos || intento.currency !== "eur") {
    console.error(
      `⚠ Pago con importe distinto en el pedido ${pedido.numero}: ${intento.amount_received} ${intento.currency} (esperado ${pedido.totalCentimos} eur). Revísalo en Stripe.`,
    );
    return;
  }

  const resultado = await marcarPedidoPagado(pedido.id, intento.id);
  if (resultado === "pagado") {
    await enviarConfirmacionPedido(pedido.id);
  } else if (resultado === "sin-stock") {
    console.error(
      `⚠ El pedido ${pedido.numero} se ha pagado tarde y ya no queda stock: hay que devolver el dinero desde el panel de Stripe.`,
    );
  }
}
