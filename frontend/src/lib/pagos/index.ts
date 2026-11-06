/**
 * PAGOS: ¿cómo se cobra?
 * ──────────────────────────────────────────────────────────────
 *   "stripe"   → si en .env están STRIPE_SECRET_KEY y NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 *                La tarjeta se escribe en el formulario oficial de Stripe (Payment Element):
 *                sus datos van directos a Stripe y NUNCA pasan por nuestro servidor.
 *                El pedido solo se marca como pagado cuando lo confirma el webhook
 *                (src/app/api/pagos/stripe/route.ts), nunca por lo que diga el navegador.
 *   "simulado" → sin claves de Stripe: botón «Confirmar pago de prueba», sin tarjeta.
 *                En la web publicada (NODE_ENV=production) solo funciona si además
 *                PERMITIR_PAGO_SIMULADO="si" (para no regalar pedidos por un despiste).
 *   "desactivado" → web publicada sin Stripe ni permiso de pago simulado: no se puede comprar.
 *
 * Por seguridad, solo se aceptan claves de PRUEBA (sk_test_… / pk_test_…) salvo que
 * STRIPE_PERMITIR_CLAVES_REALES="si" (ver README, «Antes de publicar»).
 * Y al revés: en la web publicada, con claves de PRUEBA no se vende (cualquiera podría pagar con
 * una tarjeta de prueba) salvo que STRIPE_PERMITIR_CLAVES_PRUEBA="si" (para probar un rato).
 */
import "server-only";

export type ModoPago = "stripe" | "simulado" | "desactivado";

/** Error de configuración (se apunta en la terminal; al cliente se le da un mensaje genérico) */
export class ErrorConfigPagos extends Error {}

export function clavesStripe() {
  const secreta = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const publica = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  return { secreta, publica, webhook };
}

/** Comprueba que las claves son de prueba (o que se ha permitido usar las reales) */
function comprobarClaves(secreta: string, publica: string) {
  const reales = secreta.startsWith("sk_live_") || publica.startsWith("pk_live_");
  if (reales && process.env.STRIPE_PERMITIR_CLAVES_REALES !== "si") {
    throw new ErrorConfigPagos(
      'Hay claves REALES de Stripe en .env. Usa claves de prueba (sk_test_/pk_test_) o, al publicar, pon STRIPE_PERMITIR_CLAVES_REALES="si".',
    );
  }
}

export function modoPago(): ModoPago {
  const { secreta, publica } = clavesStripe();
  const enProduccion = process.env.NODE_ENV === "production";
  if (secreta && publica) {
    comprobarClaves(secreta, publica);
    const dePrueba = secreta.startsWith("sk_test_") || publica.startsWith("pk_test_");
    if (enProduccion && dePrueba && process.env.STRIPE_PERMITIR_CLAVES_PRUEBA !== "si") {
      return "desactivado";
    }
    return "stripe";
  }
  if (!enProduccion || process.env.PERMITIR_PAGO_SIMULADO === "si") return "simulado";
  return "desactivado";
}

/** ¿Se puede comprar ahora mismo? (para avisar a Google; una configuración mala cuenta como «no») */
export function compraAbierta(): boolean {
  try {
    return modoPago() !== "desactivado";
  } catch {
    return false;
  }
}
