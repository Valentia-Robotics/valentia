/**
 * GET /api/app/yo: para la app del móvil. La lógica (compartida con backend/) está en src/lib/app/api.ts.
 */
import { yoApp } from "@/lib/app/api";

export const dynamic = "force-dynamic";

export function GET(peticion: Request) {
  return yoApp(peticion);
}
