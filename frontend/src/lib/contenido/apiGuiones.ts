/**
 * API DE GUIONES: lo que comparten la ruta de la web (src/app/api/v1/guiones) y backend/.
 * Hoy n8n llama a la web, para pagar un solo servicio en Render. Cuando la web pase a Vercel, la misma
 * lógica seguirá en backend/: solo cambiará la dirección a la que llama n8n.
 */
import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { recibirGuion } from "@/lib/contenido/recibirGuion";

/** Un guion es texto: 64 KB sobran */
export const TAMANO_MAXIMO = 64 * 1024;

/** Un token corto se podría adivinar */
const LONGITUD_MINIMA = 32;

const huella = (texto: string) => createHash("sha256").update(texto).digest();

export interface Respuesta {
  status: 201 | 400 | 401 | 409 | 413 | 422 | 503;
  cuerpo: Record<string, unknown>;
}

/**
 * Comprueba «Authorization: Bearer <token>». Devuelve la respuesta de error, o null si es correcto.
 * Sin N8N_API_TOKEN en el servidor la API queda cerrada: nunca se abre por falta de configuración.
 */
export function comprobarToken(cabecera: string | null | undefined): Respuesta | null {
  const esperado = process.env.N8N_API_TOKEN ?? "";
  if (esperado.length < LONGITUD_MINIMA) {
    return { status: 503, cuerpo: { error: "La API no está configurada." } };
  }
  const recibido = cabecera?.match(/^Bearer (.+)$/)?.[1] ?? "";
  // Se comparan las huellas, en tiempo constante: el tiempo de respuesta no da pistas del token
  if (!timingSafeEqual(huella(recibido), huella(esperado))) {
    return { status: 401, cuerpo: { error: "Token no válido." } };
  }
  return null;
}

const urlPanel = (id: string) => {
  const web = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${web}/admin/contenido/${id}`;
};

/** Convierte el JSON recibido en la respuesta de la API */
export async function responderGuion(entrada: unknown): Promise<Respuesta> {
  const resultado = await recibirGuion(entrada, "n8n");
  switch (resultado.estado) {
    case "creado":
      return {
        status: 201,
        cuerpo: { id: resultado.id, estado: "BORRADOR", panel: urlPanel(resultado.id) },
      };
    case "repetido":
      return {
        status: 409,
        cuerpo: {
          error: "Ya se creó un guion con este título en las últimas 24 horas.",
          id: resultado.id,
        },
      };
    case "invalido":
      return {
        status: 422,
        cuerpo: { error: "El guion no es válido.", errores: resultado.errores },
      };
  }
}
