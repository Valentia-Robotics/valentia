/**
 * CÓMO LLEGÓ CADA CLIENTE (para /admin/usuarios): reglas puras, probadas en llegada.test.ts.
 *
 * Al entrar en la web, el navegador apunta en sessionStorage (se borra al cerrar la pestaña) la
 * primera página que vio y de qué web venía. Si esa persona se registra en la misma pestaña, el
 * formulario lo envía y la cuenta guarda un nombre corto: «Código QR de una tarjeta», «Google»,
 * «Directo»… Nunca se guarda la IP ni la dirección completa de la que venía.
 */
import { calcularOrigen } from "@/lib/visitas/reglas";

/** Clave de sessionStorage donde el navegador guarda la llegada */
export const CLAVE_LLEGADA = "valentia_llegada";

/** Lo que apunta el navegador al entrar (ver ApuntarLlegada) */
export interface Llegada {
  /** Web anterior (solo si es otra web) */
  referente: string;
  /** ?utm_source= de los enlaces propios */
  utm: string;
  /** Primera página vista, con sus parámetros (?codigo=…) */
  entrada: string;
}

export const ORIGEN_QR = "Código QR de una tarjeta";
export const ORIGEN_DIRECTO = "Directo";

/**
 * ¿La primera página fue la de activar con un código? Eso es escanear el QR de una tarjeta
 * (la de un kit o la de bienvenida): el QR lleva a /activar?codigo=VAL-…  Sin sesión, la web
 * le manda antes al login o al registro, con /activar?codigo=… dentro de callbackUrl.
 */
export function vieneDeQr(entrada: string): boolean {
  let texto = entrada;
  try {
    texto = decodeURIComponent(entrada);
  } catch {}
  return (
    /^\/activar\?(.*&)?codigo=\w/.test(texto) ||
    /callbackUrl=\/activar\?(.*&)?codigo=\w/.test(texto)
  );
}

/** Convierte lo que envía el navegador (texto JSON, sin fiarse de él) en un nombre corto para guardar */
export function origenDeLlegada(texto: unknown, dominioPropio: string): string | null {
  if (typeof texto !== "string" || !texto || texto.length > 2000) return null;
  let datos: Partial<Record<keyof Llegada, unknown>>;
  try {
    datos = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!datos || typeof datos !== "object") return null;
  const entrada = typeof datos.entrada === "string" ? datos.entrada.slice(0, 500) : "";
  if (entrada && vieneDeQr(entrada)) return ORIGEN_QR;
  return calcularOrigen(datos.referente, datos.utm, dominioPropio)?.slice(0, 60) ?? ORIGEN_DIRECTO;
}
