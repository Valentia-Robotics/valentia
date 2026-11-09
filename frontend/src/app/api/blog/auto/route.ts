/**
 * POST /api/blog/auto: n8n manda un artículo; queda en cola o pendiente de revisión
 * Sin sesión: cabecera x-api-key = BLOG_API_KEY. Lógica en src/lib/blog/api.ts (guía: backend/n8n/BLOG.md).
 */
import { recibirArticuloAuto } from "@/lib/blog/api";

export const dynamic = "force-dynamic";

export function POST(peticion: Request) {
  return recibirArticuloAuto(peticion);
}
