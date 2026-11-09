/**
 * CLAVES DE LAS APIS PARA MÁQUINAS (n8n): cabecera x-api-key contra una variable de entorno.
 * Cada API tiene su propia variable (N8N_API_KEY para guiones, BLOG_API_KEY para el blog):
 * si se filtra una, la otra sigue segura.
 */
import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/** Una clave corta se podría adivinar: por debajo de esto la API se queda cerrada */
const LONGITUD_MINIMA = 32;

const huella = (texto: string) => createHash("sha256").update(texto).digest();

/**
 * null si la clave es buena; si no, la respuesta de error. Se comparan las huellas en tiempo
 * constante: el tiempo de respuesta no da pistas. Sin clave en el servidor, la API está cerrada (503):
 * nunca se abre por falta de configuración.
 */
export function comprobarClaveApi(peticion: Request, variable: string): Response | null {
  const esperada = process.env[variable] ?? "";
  if (esperada.length < LONGITUD_MINIMA) {
    return Response.json(
      { error: `La API no está configurada (falta ${variable}).` },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const recibida = peticion.headers.get("x-api-key") ?? "";
  if (!timingSafeEqual(huella(recibida), huella(esperada))) {
    return Response.json(
      { error: "Falta la cabecera x-api-key o no es correcta." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return null;
}
