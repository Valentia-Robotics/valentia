/**
 * Reglas de validación (con Zod) para iniciar sesión y crear una cuenta.
 */
import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Revisa el email: parece que falta algo"));

export const esquemaLogin = z.object({
  email,
  contrasena: z.string().min(1, "Escribe tu contraseña").max(200),
});

export const esquemaRegistro = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(80, "El nombre es demasiado largo"),
  email,
  contrasena: z
    .string()
    .min(8, "La contraseña necesita al menos 8 caracteres")
    // bcrypt solo tiene en cuenta los primeros 72 bytes
    .max(72, "La contraseña es demasiado larga (máximo 72 caracteres)"),
});

/** Solo deja volver a direcciones de nuestra propia web (evita redirecciones a webs ajenas) */
export function rutaSegura(valor: unknown, porDefecto = "/cursos"): string {
  if (typeof valor !== "string" || valor === "") return porDefecto;
  try {
    // Nos quedamos solo con la ruta (/cursos/…?x=1): aunque venga una dirección completa
    // de otra web, el resultado siempre se queda dentro de la nuestra.
    const url = new URL(valor, "http://valentia.local");
    const ruta = `${url.pathname}${url.search}`;
    return ruta.startsWith("/") && !ruta.startsWith("//") ? ruta : porDefecto;
  } catch {
    return porDefecto;
  }
}
