/**
 * REGLAS DE LA VERIFICACIÓN POR CÓDIGO
 * Todos los tiempos y límites en un solo sitio. Cámbialos aquí.
 */
import type { Rol } from "@/generated/prisma/enums";

export const CODIGO = {
  /** Cifras del código */
  cifras: 6,
  /** Minutos que vale cada código */
  minutosValidez: 10,
  /** Intentos fallidos permitidos; después hay que pedir otro código */
  maximoIntentos: 5,
  /** Segundos de espera entre un envío y el siguiente */
  segundosEntreEnvios: 60,
  /** Envíos como máximo por email en una hora */
  enviosPorHora: 5,
} as const;

/** Días que un navegador es "de confianza" (sin volver a pedir código) según el rol */
export const DIAS_CONFIANZA: Record<Rol, number> = {
  CLIENTE: 30,
  ADMIN: 7,
  EDITOR: 7,
  HARDWARE: 7,
};

/** Segundos que vale el "pase" que convierte un dispositivo de confianza en una sesión */
export const SEGUNDOS_PASE = 60;

/** Cada cuánto se apunta, como mucho, el "último uso" de un dispositivo */
export const MINUTOS_ENTRE_USOS = 60;

/** Nombres de las cookies (las dos son httpOnly: el JavaScript de la página no puede leerlas) */
export const COOKIES = {
  verificacion: "valentia_verificacion",
  dispositivo: "valentia_dispositivo",
} as const;
