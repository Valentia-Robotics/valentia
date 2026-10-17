"use client";

import { useConsentimiento } from "@/store/consentimiento";
import { cn } from "@/lib/utils";

/** Reabre el panel de cookies (pie de página y política de cookies) */
export function BotonConfigurarCookies({ className }: { className?: string }) {
  const abrirPanel = useConsentimiento((estado) => estado.abrirPanel);
  return (
    <button
      type="button"
      onClick={abrirPanel}
      className={cn("text-acento underline underline-offset-2", className)}
    >
      Configurar cookies
    </button>
  );
}
