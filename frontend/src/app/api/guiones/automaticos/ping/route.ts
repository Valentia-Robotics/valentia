/** GET /api/guiones/automaticos/ping: comprueba la clave de n8n sin crear nada → { ok: true } */
import { ping } from "@/lib/contenido/guionesAutomaticos";

export const dynamic = "force-dynamic";

export function GET(peticion: Request) {
  return ping(peticion);
}
