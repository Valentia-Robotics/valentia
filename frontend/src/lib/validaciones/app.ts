/**
 * Lo que manda la app del móvil a /api/app/*. Mismas reglas que los formularios de la web.
 */
import { z } from "zod";
import { esquemaLogin } from "@/lib/validaciones/cuenta";
import { CODIGO } from "@/lib/verificacion/reglas";

const sistema = z.enum(["android", "ios", "otro"]).optional();

/** El token de la verificación en curso (lo devolvió /entrar) */
const verificacion = z.string().regex(/^[A-Za-z0-9_-]{20,100}$/, "Vuelve a iniciar sesión.");

export const esquemaEntrarApp = esquemaLogin.extend({ sistema });

export const esquemaVerificarApp = z.object({
  verificacion,
  codigo: z
    .string()
    .regex(new RegExp(`^[0-9]{${CODIGO.cifras}}$`), `El código tiene ${CODIGO.cifras} cifras.`),
  sistema,
});

export const esquemaReenviarApp = z.object({ verificacion });

/** Código del kit: escrito a mano o leído del QR (la dirección completa de /activar) */
export const esquemaActivarApp = z.object({ codigo: z.string().trim().min(1).max(300) });

/**
 * Saca el código de lo que lee la cámara: el QR lleva «https://…/activar?codigo=VAL-XXXX-XXXX».
 * Si no es una dirección, lo trata como el código escrito a mano.
 */
export function codigoDeTexto(texto: string): string {
  const limpio = texto.trim();
  try {
    const url = new URL(limpio);
    return url.searchParams.get("codigo") ?? limpio;
  } catch {
    return limpio;
  }
}
