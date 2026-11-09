"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { ID_ANALITICA } from "@/config/analitica";
import { useConsentimiento, useConsentimientoHidratado } from "@/store/consentimiento";

/**
 * Google Analytics 4, SOLO con el permiso de la persona (categoría «Analítica» del aviso de cookies).
 * Sin NEXT_PUBLIC_GA_ID no hace nada. Si después retira el permiso, se apaga y se borran sus cookies.
 * No cuenta en el panel ni en el editor.
 */
export function AnaliticaGoogle() {
  const ruta = usePathname();
  const hidratado = useConsentimientoHidratado();
  const permiso = useConsentimiento((e) => e.preferencias.analitica);
  const activa = Boolean(ID_ANALITICA) && hidratado && permiso;

  useEffect(() => {
    if (!ID_ANALITICA || !hidratado) return;
    // Bandera oficial de Google para dejar de medir sin recargar la página
    (window as unknown as Record<string, boolean>)[`ga-disable-${ID_ANALITICA}`] = !permiso;
    if (!permiso) {
      for (const cookie of document.cookie.split(";")) {
        const nombre = cookie.split("=")[0].trim();
        if (nombre === "_ga" || nombre.startsWith("_ga_")) {
          const dominio = location.hostname.replace(/^www\./, "");
          document.cookie = `${nombre}=; Max-Age=0; path=/; domain=.${dominio}`;
          document.cookie = `${nombre}=; Max-Age=0; path=/`;
        }
      }
    }
  }, [hidratado, permiso]);

  if (!activa || /^\/(admin|editor)(\/|$)/.test(ruta)) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ID_ANALITICA}`}
        strategy="afterInteractive"
      />
      <Script id="analitica-google" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","${ID_ANALITICA}");`}
      </Script>
    </>
  );
}
