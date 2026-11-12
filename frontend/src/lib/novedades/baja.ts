/**
 * ENLACE PARA DARSE DE BAJA DE LAS NOVEDADES
 * Cada correo lleva un enlace personal: /novedades/baja?u=<id de la cuenta>&t=<firma>.
 * La firma es un HMAC con AUTH_SECRET: nadie puede dar de baja a otra persona inventándose el enlace,
 * y no hace falta iniciar sesión (la ley pide que darse de baja sea fácil).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function firmar(usuarioId: string, secreto: string): string {
  return createHmac("sha256", secreto)
    .update(`novedades-baja:${usuarioId}`)
    .digest("base64url")
    .slice(0, 32);
}

function secreto(): string {
  const valor = process.env.AUTH_SECRET;
  if (!valor) throw new Error("Falta AUTH_SECRET en el archivo .env");
  return valor;
}

/** La firma del enlace de baja de esta cuenta */
export function firmaBaja(usuarioId: string, clave = secreto()): string {
  return firmar(usuarioId, clave);
}

/** ¿La firma es buena? (comparación en tiempo constante) */
export function firmaBajaValida(usuarioId: string, firma: string, clave = secreto()): boolean {
  const buena = Buffer.from(firmar(usuarioId, clave));
  const recibida = Buffer.from(firma);
  return buena.length === recibida.length && timingSafeEqual(buena, recibida);
}

/** Dirección completa para darse de baja (la página) */
export function urlBaja(usuarioId: string, clave = secreto()): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/novedades/baja?u=${usuarioId}&t=${firmaBaja(usuarioId, clave)}`;
}

/** Dirección para el «Cancelar suscripción» de Gmail y compañía (POST de un clic, RFC 8058) */
export function urlBajaUnClic(usuarioId: string, clave = secreto()): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/novedades/baja?u=${usuarioId}&t=${firmaBaja(usuarioId, clave)}`;
}
