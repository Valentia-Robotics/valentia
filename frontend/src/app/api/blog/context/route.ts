/**
 * GET /api/blog/context: lo que n8n necesita para escribir (kits, artículos recientes, categorías)
 * Sin sesión: cabecera x-api-key = BLOG_API_KEY. Lógica en src/lib/blog/api.ts (guía: backend/n8n/BLOG.md).
 */
import { contextoBlog } from "@/lib/blog/api";

export const dynamic = "force-dynamic";

export function GET(peticion: Request) {
  return contextoBlog(peticion);
}
