/**
 * TOKEN DE LA API: quien llama tiene que enviar «Authorization: Bearer <token>».
 * Sin N8N_API_TOKEN en el servidor la API queda cerrada: nunca se abre por falta de configuración.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";

/** Un token corto se podría adivinar */
const LONGITUD_MINIMA = 32;

const huella = (texto: string) => createHash("sha256").update(texto).digest();

export const exigirToken: MiddlewareHandler = async (c, siguiente) => {
  const esperado = process.env.N8N_API_TOKEN ?? "";
  if (esperado.length < LONGITUD_MINIMA) {
    return c.json({ error: "La API no está configurada." }, 503);
  }
  const recibido =
    c.req.header("authorization")?.match(/^Bearer (.+)$/)?.[1] ?? "";
  // Se comparan las huellas, en tiempo constante: el tiempo de respuesta no da pistas del token
  if (!timingSafeEqual(huella(recibido), huella(esperado))) {
    return c.json({ error: "Token no válido." }, 401);
  }
  await siguiente();
};
