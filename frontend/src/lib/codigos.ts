/**
 * CÓDIGOS DE ACTIVACIÓN Y NÚMEROS DE PEDIDO
 * Se generan al azar con el generador seguro del sistema (crypto), así que
 * nadie puede adivinarlos. Se usan en el checkout y en el seed.
 */
import { randomInt } from "node:crypto";

/** Letras y números que no se confunden al leerlos impresos (sin 0/O ni 1/I) */
export const ALFABETO_CODIGOS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function bloque(longitud: number): string {
  let texto = "";
  for (let i = 0; i < longitud; i++) {
    texto += ALFABETO_CODIGOS[randomInt(ALFABETO_CODIGOS.length)];
  }
  return texto;
}

/** Código que va en la caja del kit. Ejemplo: VAL-7KQ2-M9XD (32^8 ≈ 1 billón de combinaciones) */
export function generarCodigoActivacion(): string {
  return `VAL-${bloque(4)}-${bloque(4)}`;
}

/** Comprueba que un texto tiene la forma de un código de activación */
export const FORMATO_CODIGO = /^VAL-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

/** Número de pedido que ve el cliente. Ejemplo: VAL-2026-4F7K9Q */
export function generarNumeroPedido(fecha = new Date()): string {
  return `VAL-${fecha.getFullYear()}-${bloque(6)}`;
}

/**
 * Limpia un código escrito a mano: mayúsculas, sin espacios y con sus guiones.
 * Ejemplo: " val 7kq2m9xd " → "VAL-7KQ2-M9XD"
 */
export function normalizarCodigo(texto: string): string {
  const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const resto = limpio.startsWith("VAL") ? limpio.slice(3) : limpio;
  return resto.length === 8
    ? `VAL-${resto.slice(0, 4)}-${resto.slice(4)}`
    : texto.trim().toUpperCase();
}
