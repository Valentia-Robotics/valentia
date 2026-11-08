/**
 * POST /api/app/entrar: para la app del móvil. La lógica (compartida con backend/) está en src/lib/app/api.ts.
 */
import { entrarApp } from "@/lib/app/api";

export const dynamic = "force-dynamic";

export function POST(peticion: Request) {
  return entrarApp(peticion);
}
