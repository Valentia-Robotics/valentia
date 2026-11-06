"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Cada cuánto se vuelve a preguntar, y durante cuánto tiempo como máximo */
const CADA_MS = 3000;
const MAXIMO_MS = 3 * 60_000;

/**
 * Mientras el pago se confirma (el webhook de Stripe puede tardar unos segundos),
 * recarga los datos de la página cada pocos segundos. Al cambiar de estado, deja de hacerlo.
 */
export function EsperarPago() {
  const router = useRouter();
  const [agotado, setAgotado] = useState(false);

  useEffect(() => {
    const inicio = Date.now();
    const temporizador = setInterval(() => {
      if (Date.now() - inicio > MAXIMO_MS) {
        clearInterval(temporizador);
        setAgotado(true);
        return;
      }
      router.refresh();
    }, CADA_MS);
    return () => clearInterval(temporizador);
  }, [router]);

  return agotado ? (
    <p className="mt-3 text-sm text-gris">
      Está tardando más de lo normal. Te enviaremos un correo en cuanto se confirme; también puedes
      recargar esta página más tarde.
    </p>
  ) : (
    <p role="status" className="mt-3 flex items-center gap-2 text-sm text-gris">
      <span className="size-2 animate-pulse rounded-full bg-acento" aria-hidden="true" />
      Comprobando el pago…
    </p>
  );
}
