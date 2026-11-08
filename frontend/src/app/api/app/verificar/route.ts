/**
 * POST /api/app/verificar: para la app del móvil. La lógica (compartida con backend/) está en src/lib/app/api.ts.
 */
import { verificarApp } from "@/lib/app/api";

export const dynamic = "force-dynamic";

export function POST(peticion: Request) {
  return verificarApp(peticion);
}
