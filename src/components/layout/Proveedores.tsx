"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { BannerCookies } from "./BannerCookies";

/**
 * Comparte la sesión con los componentes del navegador (por ejemplo, la barra de navegación).
 * La sesión se pide al servidor desde el navegador, así las páginas pueden seguir siendo estáticas.
 * También pone el banner de cookies en todas las páginas.
 */
export function Proveedores({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <BannerCookies />
    </SessionProvider>
  );
}
