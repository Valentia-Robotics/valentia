/**
 * CORREO
 * El resto de la web solo usa enviarCorreo(): para cambiar de servicio no hay que tocar nada más.
 *
 * Elige el "cartero" así:
 *   - Con "npm run dev" SIEMPRE se usa la consola: nunca salen correos reales mientras programas.
 *   - En producción, según CORREO_PROVEEDOR en .env: "resend" (ver resend.ts) o "consola".
 */
import "server-only";
import { correoConsola } from "./consola";
import { correoResend } from "./resend";
import type { Correo, ProveedorCorreo } from "./tipos";

function cartero(): ProveedorCorreo {
  if (process.env.NODE_ENV === "development") return correoConsola;
  return process.env.CORREO_PROVEEDOR === "resend" ? correoResend : correoConsola;
}

/**
 * Envía un correo. Si falla, lo apunta en la terminal y devuelve false
 * (un correo que no sale no debe romper la página).
 */
export async function enviarCorreo(correo: Correo): Promise<boolean> {
  try {
    await cartero().enviar(correo);
    return true;
  } catch (error) {
    console.error(`No se ha podido enviar el correo "${correo.asunto}":`, error);
    return false;
  }
}

export type { Correo } from "./tipos";
