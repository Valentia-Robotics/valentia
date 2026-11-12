"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { AnaliticaGoogle } from "./AnaliticaGoogle";
import { ApuntarLlegada } from "./ApuntarLlegada";
import { BannerCookies } from "./BannerCookies";
import { BarraCarga } from "./BarraCarga";
import { ContadorVisitas } from "./ContadorVisitas";

/**
 * Comparte la sesión con los componentes del navegador (por ejemplo, la barra de navegación).
 * La sesión se pide al servidor desde el navegador, así las páginas pueden seguir siendo estáticas.
 * También pone el banner de cookies y el contador de visitas (sin cookies) en todas las páginas.
 */
export function Proveedores({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <BarraCarga />
      {children}
      <BannerCookies />
      <ContadorVisitas />
      <ApuntarLlegada />
      <AnaliticaGoogle />
    </SessionProvider>
  );
}
