/**
 * AVISOS PUSH DE ESTE APARATO (solo el equipo; a cualquier otro, 404):
 *   GET    /api/push → { clave }: la clave pública que necesita el navegador para suscribirse
 *   POST   /api/push { suscripcion } → guarda este aparato para mandarle los avisos
 *   DELETE /api/push { endpoint } → deja de mandarle avisos
 */
import { esDelEquipo } from "@/config/equipo";
import { leerSuscripcion, nombreAparato } from "@/config/push";
import { leerCuerpo } from "@/lib/cuerpoLimitado";
import { registrarIntento } from "@/lib/limite";
import { mismoSitio } from "@/lib/mismoSitio";
import { clavePublicaPush, guardarSuscripcion, quitarSuscripcion } from "@/lib/push/push";
import { obtenerUsuario } from "@/lib/sesion";

const respuesta = (cuerpo: object, status = 200) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });

async function quien(peticion: Request, conCuerpo: boolean) {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol)) return { error: respuesta({ error: "No encontrado" }, 404) };
  if (conCuerpo && !mismoSitio(peticion))
    return { error: respuesta({ error: "No permitido" }, 403) };
  return { yo };
}

async function leerJson(peticion: Request): Promise<Record<string, unknown> | null> {
  const texto = await leerCuerpo(peticion, 4096);
  if (!texto) return null;
  try {
    const datos = JSON.parse(texto);
    return datos && typeof datos === "object" ? datos : null;
  } catch {
    return null;
  }
}

export async function GET(peticion: Request) {
  const { yo, error } = await quien(peticion, false);
  if (!yo) return error;
  return respuesta({ clave: await clavePublicaPush() });
}

export async function POST(peticion: Request) {
  const { yo, error } = await quien(peticion, true);
  if (!yo) return error;
  if (!(await registrarIntento("avisosPush", yo.id)))
    return respuesta({ error: "Demasiados intentos. Prueba dentro de un rato." }, 429);
  const datos = await leerJson(peticion);
  const suscripcion = leerSuscripcion(datos?.suscripcion);
  if (!suscripcion) return respuesta({ error: "El navegador no ha dado datos válidos." }, 400);
  await guardarSuscripcion(
    yo.id,
    suscripcion,
    nombreAparato(peticion.headers.get("user-agent") ?? ""),
  );
  return respuesta({ ok: true });
}

export async function DELETE(peticion: Request) {
  const { yo, error } = await quien(peticion, true);
  if (!yo) return error;
  const datos = await leerJson(peticion);
  if (typeof datos?.endpoint !== "string") return respuesta({ error: "Falta el aparato." }, 400);
  await quitarSuscripcion(yo.id, datos.endpoint);
  return respuesta({ ok: true });
}
