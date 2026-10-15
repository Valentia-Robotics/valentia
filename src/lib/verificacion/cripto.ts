/**
 * CIFRADO DE CÓDIGOS Y TOKENS
 * Nada de lo que da acceso a una cuenta se guarda tal cual en la base de datos:
 * solo su "huella" (hash). Si alguien viera la base de datos, no podría usarla.
 */
import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { CODIGO } from "./reglas";

/** Token largo y al azar para una cookie (imposible de adivinar) */
export function generarToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Huella SHA-256 de un token. Como el token es largo y al azar, basta con esto. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Código de 6 cifras al azar (puede empezar por 0) */
export function generarCodigo(): string {
  return randomInt(0, 10 ** CODIGO.cifras)
    .toString()
    .padStart(CODIGO.cifras, "0");
}

/**
 * Huella de un código. Un código de 6 cifras solo tiene un millón de posibilidades, así que
 * se mezcla con la clave secreta del servidor (AUTH_SECRET): sin ella no se pueden probar todas.
 * También se mezcla con el email y el motivo: el código solo vale para eso.
 */
export function hashCodigo(email: string, motivo: string, codigo: string): string {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) throw new Error("Falta AUTH_SECRET en el archivo .env");
  return createHmac("sha256", secreto).update(`${motivo}:${email}:${codigo}`).digest("hex");
}

/** Compara dos huellas tardando siempre lo mismo (así no se puede adivinar por el tiempo) */
export function mismaHuella(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
