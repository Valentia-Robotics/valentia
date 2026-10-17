"use client";

import { CircleAlert, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import { Boton } from "@/components/ui/Boton";
import { formatearPrecio } from "@/lib/utils";

interface Props {
  clientSecret: string;
  clavePublica: string;
  /** Dirección (relativa) de nuestra web a la que vuelve Stripe después de pagar */
  urlVuelta: string;
  totalCentimos: number;
}

/**
 * FORMULARIO DE PAGO DE STRIPE (Payment Element)
 * Stripe dibuja los campos de la tarjeta dentro de su propio marco seguro: el número, la
 * caducidad y el CVC van directamente de tu navegador a Stripe y NUNCA pasan por nuestro
 * servidor. Nosotros solo vemos si el pago ha ido bien (y eso lo confirma el webhook).
 *
 * Stripe.js se descarga aquí, solo al llegar al pago ("@stripe/stripe-js/pure" no lo carga antes).
 */
export function PagoStripe({ clientSecret, clavePublica, urlVuelta, totalCentimos }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const stripe = useRef<Stripe | null>(null);
  const elementos = useRef<StripeElements | null>(null);
  const [listo, setListo] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const { loadStripe } = await import("@stripe/stripe-js/pure");
        const instancia = await loadStripe(clavePublica, { locale: "es" });
        if (cancelado || !instancia || !contenedor.current) return;
        const grupo = instancia.elements({
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#2d4bff",
              colorText: "#0b0b0b",
              colorDanger: "#d92d20",
              borderRadius: "12px",
              fontFamily: "Inter, system-ui, sans-serif",
            },
          },
        });
        const elemento = grupo.create("payment", { layout: "tabs" });
        elemento.on("ready", () => !cancelado && setListo(true));
        elemento.mount(contenedor.current);
        stripe.current = instancia;
        elementos.current = grupo;
      } catch {
        if (!cancelado)
          setError("No hemos podido cargar el formulario de pago. Recarga la página.");
      }
    })();
    return () => {
      cancelado = true;
      elementos.current?.getElement("payment")?.destroy();
    };
  }, [clientSecret, clavePublica]);

  async function pagar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!stripe.current || !elementos.current) return;
    setPagando(true);
    setError(null);
    // Si todo va bien, Stripe nos lleva a urlVuelta (allí esperamos la confirmación del webhook)
    const { error: fallo } = await stripe.current.confirmPayment({
      elements: elementos.current,
      confirmParams: { return_url: new URL(urlVuelta, window.location.origin).toString() },
    });
    // Solo llegamos aquí si hay un error (tarjeta rechazada, datos incompletos…)
    setError(fallo.message ?? "No se ha podido completar el pago. Revisa los datos.");
    setPagando(false);
  }

  return (
    <form onSubmit={pagar} className="mt-5">
      <div ref={contenedor} className="min-h-40" />
      {!listo && !error && <p className="text-sm text-gris">Cargando el pago seguro…</p>}
      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-control bg-error/8 p-4 text-sm text-error-oscuro"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {error}
        </p>
      )}
      <Boton
        type="submit"
        variante="acento"
        tamano="xl"
        disabled={!listo || pagando}
        className="mt-6 w-full"
      >
        <Lock aria-hidden="true" className="size-5" />
        {pagando ? "Procesando el pago…" : `Pagar ${formatearPrecio(totalCentimos)}`}
      </Boton>
      <p className="mt-3 text-center text-xs text-gris">
        Pago seguro procesado por Stripe. Tus datos de tarjeta nunca llegan a nuestros servidores.
      </p>
    </form>
  );
}
