/**
 * COMPROBACIÓN DE SALUD: /api/health
 * Render la llama cada pocos segundos para saber si la web está viva (Health Check Path).
 *
 *   /api/health       → solo confirma que el servidor responde. NO toca la base de datos, así que
 *                       contesta al instante (si Atlas fallara, Render no reiniciaría la web en bucle).
 *   /api/health?db=1  → además hace un "ping" a MongoDB con un límite de 4 s (para diagnosticar).
 *                       Si falla: 503 y el motivo real en los logs de Render (sin contraseñas).
 *
 * El proxy (src/proxy.ts) no pasa por /api, así que esta ruta nunca pide sesión ni redirige.
 */
import { db } from "@/lib/db";
import {
  conTiempoLimite,
  explicarErrorBD,
  revisarDireccion,
  TiempoAgotadoError,
  type ErrorBDExplicado,
} from "@/lib/diagnosticoBD";

// Siempre en el momento (nunca una respuesta guardada del build)
export const dynamic = "force-dynamic";

/** Tiempo máximo para el ping (Render da 5 s por comprobación) */
const LIMITE_PING_MS = 4000;

const SIN_CACHE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const comprobarBD = new URL(request.url).searchParams.get("db") === "1";
  if (!comprobarBD) {
    return Response.json({ estado: "ok" }, { headers: SIN_CACHE });
  }

  const inicio = Date.now();
  const direccionMal = revisarDireccion(process.env.DATABASE_URL);
  if (direccionMal) return respuestaError(direccionMal, inicio);
  const ping = db.$runCommandRaw({ ping: 1 });
  try {
    await conTiempoLimite(ping, LIMITE_PING_MS);
    return Response.json(
      { estado: "ok", baseDeDatos: "ok", ms: Date.now() - inicio },
      { headers: SIN_CACHE },
    );
  } catch (error) {
    if (error instanceof TiempoAgotadoError) {
      // Prisma sigue intentándolo (hasta ~30 s): cuando falle, su motivo real también va a los logs
      ping.catch((tarde: unknown) => {
        const explicado = explicarErrorBD(tarde);
        console.error(
          `[health] Motivo del tiempo agotado (${explicado.motivo}): ${explicado.explicacion}\n  Detalle: ${explicado.detalle}`,
        );
      });
    }
    return respuestaError(explicarErrorBD(error), inicio);
  }
}

/** 503 + el motivo real en los logs. Al público solo el tipo de problema (sin detalles internos). */
function respuestaError(error: ErrorBDExplicado, inicio: number) {
  console.error(
    `[health] Base de datos no disponible (${error.motivo}): ${error.explicacion}\n  Detalle: ${error.detalle}`,
  );
  return Response.json(
    { estado: "error", baseDeDatos: error.motivo, ms: Date.now() - inicio },
    { status: 503, headers: SIN_CACHE },
  );
}
