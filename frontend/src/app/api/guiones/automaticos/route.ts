/**
 * POST /api/guiones/automaticos: n8n crea aquí un guion, pendiente de aprobación del admin.
 * Para una máquina, no para una persona: sin sesión, con la cabecera x-api-key (N8N_API_KEY).
 * La lógica, compartida con backend/, está en src/lib/contenido/guionesAutomaticos.ts.
 * El proxy no pasa por /api: esta ruta nunca pide sesión ni redirige.
 */
import { crearDesdeN8n } from "@/lib/contenido/guionesAutomaticos";

export const dynamic = "force-dynamic";

export function POST(peticion: Request) {
  return crearDesdeN8n(peticion);
}
