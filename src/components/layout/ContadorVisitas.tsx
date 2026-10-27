"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Avisa al servidor de cada página vista, para las estadísticas del panel (/admin/visitas).
 * Sin cookies: solo envía la página y, en la primera, de qué web viene la persona.
 * No cuenta al administrador (así sus propias visitas no inflan las cifras) ni a los
 * navegadores controlados por programas (pruebas automáticas).
 */
export function ContadorVisitas() {
  const ruta = usePathname();
  const { data: sesion, status } = useSession();
  const enviadas = useRef(0);
  const ultima = useRef<string | null>(null);

  useEffect(() => {
    // Espera a saber si hay sesión, para no contar al administrador
    if (status === "loading" || sesion?.user?.rol === "ADMIN") return;
    if (navigator.webdriver || ruta === ultima.current) return;
    ultima.current = ruta;

    const entrada = enviadas.current === 0;
    enviadas.current++;
    let referente = "";
    let utm = "";
    if (entrada) {
      // De qué web viene (solo si es otra web) y la etiqueta ?utm_source= de los enlaces propios
      try {
        if (document.referrer && new URL(document.referrer).host !== location.host) {
          referente = document.referrer;
        }
      } catch {}
      utm = new URLSearchParams(location.search).get("utm_source") ?? "";
    }

    const datos = JSON.stringify({ ruta, entrada, referente, utm });
    const blob = new Blob([datos], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/visitas", blob)) {
      fetch("/api/visitas", { method: "POST", body: datos, keepalive: true }).catch(() => {});
    }
  }, [ruta, status, sesion?.user?.rol]);

  return null;
}
