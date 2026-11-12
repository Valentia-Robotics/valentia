/**
 * BAJA CON UN CLIC (RFC 8058): el botón «Cancelar suscripción» que Gmail, Yahoo, Outlook…
 * ponen junto al remitente llama aquí con un POST. La dirección lleva la firma (ver lib/novedades/baja.ts).
 */
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { firmaBajaValida } from "@/lib/novedades/baja";
import { guardarPreferenciaNovedades } from "@/lib/novedades/novedades";

export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  const u = params.get("u");
  const t = params.get("t");
  if (!esId(u) || !t || !firmaBajaValida(u, t)) {
    return new Response("Enlace no válido", { status: 400 });
  }
  if (await db.usuario.findUnique({ where: { id: u }, select: { id: true } })) {
    await guardarPreferenciaNovedades(u, false);
  }
  return new Response("Hecho: no recibirás más correos de novedades.", { status: 200 });
}
