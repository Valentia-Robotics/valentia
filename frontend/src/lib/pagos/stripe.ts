/**
 * STRIPE (servidor)
 * Crea el "intento de pago" (PaymentIntent) de cada pedido y comprueba la firma de los
 * avisos que manda Stripe al webhook. El importe SIEMPRE sale del pedido guardado en la
 * base de datos (calculado en el servidor), nunca de lo que envía el navegador.
 */
import "server-only";
import Stripe from "stripe";
import { clavesStripe, ErrorConfigPagos } from "./index";

let cliente: Stripe | null = null;

/** Cliente de Stripe (se crea la primera vez que se usa, no al compilar) */
function stripe(): Stripe {
  const { secreta } = clavesStripe();
  if (!secreta) throw new ErrorConfigPagos("Falta STRIPE_SECRET_KEY en .env");
  cliente ??= new Stripe(secreta, { appInfo: { name: "Valentia" } });
  return cliente;
}

/** Datos del pedido que necesita Stripe */
export interface PedidoParaCobrar {
  id: string;
  numero: string;
  email: string;
  totalCentimos: number;
}

/**
 * Crea el PaymentIntent del pedido. La clave de idempotencia (el id del pedido) hace que,
 * si se repite la llamada, Stripe devuelva el mismo intento en lugar de crear otro.
 */
export async function crearIntentoPago(pedido: PedidoParaCobrar) {
  const intento = await stripe().paymentIntents.create(
    {
      amount: pedido.totalCentimos, // Stripe también trabaja en céntimos
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      receipt_email: pedido.email,
      description: `Pedido ${pedido.numero}`,
      metadata: { pedidoId: pedido.id, numero: pedido.numero },
    },
    { idempotencyKey: `pedido-${pedido.id}` },
  );
  if (!intento.client_secret) throw new Error("Stripe no ha devuelto client_secret");
  return { id: intento.id, clientSecret: intento.client_secret };
}

/** El client_secret de un intento ya creado (para volver a la pantalla de pago) */
export async function secretoDeIntento(id: string): Promise<string | null> {
  const intento = await stripe().paymentIntents.retrieve(id);
  return intento.status === "requires_payment_method" || intento.status === "requires_action"
    ? intento.client_secret
    : null;
}

/**
 * Cancela un intento de pago que ya no se va a usar (pedido caducado o anulado).
 * Devuelve false si no se puede porque el cliente YA ha pagado: en ese caso no hay que
 * cancelar el pedido (el webhook lo marcará como pagado).
 */
export async function cancelarIntentoPago(id: string): Promise<boolean> {
  try {
    const intento = await stripe().paymentIntents.retrieve(id);
    if (intento.status === "succeeded" || intento.status === "processing") return false;
    if (intento.status !== "canceled") await stripe().paymentIntents.cancel(id);
    return true;
  } catch (error) {
    console.error(`No se ha podido cancelar el pago ${id} en Stripe:`, error);
    return false;
  }
}

/**
 * Comprueba que un aviso del webhook viene de verdad de Stripe (firma con STRIPE_WEBHOOK_SECRET)
 * y lo devuelve. Lanza un error si la firma no es válida.
 */
export function verificarEvento(cuerpo: string, firma: string): Stripe.Event {
  const { webhook } = clavesStripe();
  if (!webhook) throw new ErrorConfigPagos("Falta STRIPE_WEBHOOK_SECRET en .env");
  return stripe().webhooks.constructEvent(cuerpo, firma, webhook);
}
