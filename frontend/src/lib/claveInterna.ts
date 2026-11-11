/**
 * CLAVE INTERNA: la usa el propio servidor para llamarse a sí mismo (p. ej. cada minuto, para los
 * recordatorios de tareas). Sale de AUTH_SECRET, así no hace falta otra variable en Render.
 * Sin AUTH_SECRET no hay clave (y la ruta interna responde 404).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function claveInterna(para: string): string | null {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) return null;
  return createHmac("sha256", secreto).update(`interna:${para}`).digest("base64url");
}

export function claveInternaValida(para: string, recibida: string | null): boolean {
  const buena = claveInterna(para);
  if (!buena || !recibida) return false;
  const a = Buffer.from(buena);
  const b = Buffer.from(recibida);
  return a.length === b.length && timingSafeEqual(a, b);
}
