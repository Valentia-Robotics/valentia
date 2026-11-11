/**
 * ¿HAY ALGO NUEVO EN EL CHAT? GET /api/mensajes/huella?chat=<general o id> → { huella }
 * El chat abierto lo pregunta cada pocos segundos; si la huella cambia, recarga sus mensajes.
 * Es mucho más ligero que pedir la página entera cada vez. Solo para el equipo (si no, 404).
 */
import { esDelEquipo } from "@/config/equipo";
import { huellaChat } from "@/lib/mensajes/mensajes";
import { obtenerUsuario } from "@/lib/sesion";

export async function GET(peticion: Request) {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol)) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }
  const chat = new URL(peticion.url).searchParams.get("chat") ?? "";
  const huella = await huellaChat(yo, chat);
  if (!huella) return Response.json({ error: "No encontrado" }, { status: 404 });
  return Response.json({ huella }, { headers: { "Cache-Control": "no-store" } });
}
