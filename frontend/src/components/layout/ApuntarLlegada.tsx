"use client";

import { useEffect } from "react";
import { CLAVE_LLEGADA, type Llegada } from "@/config/llegada";

/**
 * Al entrar en la web, apunta en esta pestaña (sessionStorage, se borra al cerrarla) la primera
 * página y de qué web venía. Solo se usa si la persona se registra: ver src/config/llegada.ts.
 */
export function ApuntarLlegada() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CLAVE_LLEGADA)) return;
      let referente = "";
      if (document.referrer && new URL(document.referrer).host !== location.host) {
        referente = document.referrer;
      }
      const llegada: Llegada = {
        referente,
        utm: new URLSearchParams(location.search).get("utm_source") ?? "",
        entrada: (location.pathname + location.search).slice(0, 500),
      };
      sessionStorage.setItem(CLAVE_LLEGADA, JSON.stringify(llegada));
    } catch {}
  }, []);
  return null;
}

/** Lo apuntado al entrar (o "" si no hay nada), para enviarlo con el registro */
export function leerLlegada(): string {
  try {
    return sessionStorage.getItem(CLAVE_LLEGADA) ?? "";
  } catch {
    return "";
  }
}
