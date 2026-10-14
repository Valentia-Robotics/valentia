import type { ProveedorPago } from "./tipos";

/**
 * PAGO CON STRIPE (todavía sin activar)
 * ──────────────────────────────────────────────────────────────
 * Cuando quieras cobrar de verdad:
 *
 * 1. Crea una cuenta en https://stripe.com y copia tu clave secreta de pruebas (empieza por sk_test_).
 * 2. Instala la librería oficial:  npm install stripe
 * 3. En .env añade:
 *        PAGOS_PROVEEDOR="stripe"
 *        STRIPE_SECRET_KEY="sk_test_..."
 *        STRIPE_WEBHOOK_SECRET="whsec_..."
 * 4. Sustituye la función cobrar() de abajo por algo así:
 *
 *        import Stripe from "stripe";
 *        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
 *        const sesion = await stripe.checkout.sessions.create({
 *          mode: "payment",
 *          customer_email: datos.email,
 *          client_reference_id: datos.pedidoId,
 *          line_items: datos.lineas.map((l) => ({
 *            quantity: l.cantidad,
 *            price_data: {
 *              currency: "eur",
 *              unit_amount: l.precioUnitarioCentimos, // Stripe también trabaja en céntimos
 *              product_data: { name: l.nombre },
 *            },
 *          })),
 *          success_url: datos.urlExito,
 *          cancel_url: datos.urlCancelar,
 *        });
 *        return { estado: "redirigir", url: sesion.url!, referencia: sesion.id };
 *
 * 5. Crea un "webhook" en src/app/api/pagos/stripe/route.ts que reciba el aviso
 *    "checkout.session.completed" de Stripe, compruebe la firma con STRIPE_WEBHOOK_SECRET
 *    y llame a marcarPedidoPagado(pedidoId, sesion.id) de src/lib/pedidos.ts.
 *    Esa función ya existe: es la misma que usa hoy el pago simulado y crea los códigos de los kits.
 */
export const pagoStripe: ProveedorPago = {
  id: "stripe",
  async cobrar() {
    throw new Error(
      'Stripe todavía no está configurado. Sigue los pasos de src/lib/pagos/stripe.ts o usa PAGOS_PROVEEDOR="simulado".',
    );
  },
};
