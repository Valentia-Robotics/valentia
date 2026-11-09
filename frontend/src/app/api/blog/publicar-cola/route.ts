/**
 * POST /api/blog/publicar-cola: n8n la llama cada hora; publica uno de la cola si toca
 * Sin sesión: cabecera x-api-key = BLOG_API_KEY. Lógica en src/lib/blog/api.ts (guía: backend/n8n/BLOG.md).
 */
import { publicarColaApi } from "@/lib/blog/api";

export const dynamic = "force-dynamic";

export function POST(peticion: Request) {
  return publicarColaApi(peticion);
}
