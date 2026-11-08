/**
 * POST /api/app/reenviar: para la app del móvil. La lógica (compartida con backend/) está en src/lib/app/api.ts.
 */
import { reenviarApp } from "@/lib/app/api";

export const dynamic = "force-dynamic";

export function POST(peticion: Request) {
  return reenviarApp(peticion);
}
