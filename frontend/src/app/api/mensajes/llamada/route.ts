/**
 * VIDEOLLAMADAS DEL EQUIPO: /api/mensajes/llamada
 *   GET  ?chat=<ruta>                → { llamada } la llamada en curso de ese chat (o null)
 *   POST { accion: "preparar", chat } → { entrada } la dirección con su pase, preparada al abrir el chat
 *                                      (no crea nada: así «Llamar» abre el vídeo al momento)
 *   POST { accion: "entrar", chat, sala? } → { id, sala, modo, direccion } empieza la llamada (en la
 *                                      sala preparada, si se manda) o entra en la que hay
 *   POST { accion: "latido", id }    → { sigue } «sigo dentro» (cada pocos segundos)
 *   POST { accion: "salir", id }     → { ok } colgar
 * Solo el equipo, y solo en los chats que ve cada uno (las mismas reglas que los mensajes).
 */
import { esDelEquipo } from "@/config/equipo";
import { leerCuerpo } from "@/lib/cuerpoLimitado";
import { ErrorMensaje } from "@/lib/mensajes/mensajes";
import {
  entrarEnLlamada,
  latidoLlamada,
  llamadaDelChat,
  prepararLlamada,
  salirDeLlamada,
} from "@/lib/mensajes/llamadas";
import { mismoSitio } from "@/lib/mismoSitio";
import { obtenerUsuario } from "@/lib/sesion";

const respuesta = (cuerpo: object, status = 200) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(peticion: Request) {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol)) return respuesta({ error: "No encontrado" }, 404);
  const chat = new URL(peticion.url).searchParams.get("chat") ?? "";
  return respuesta({ llamada: await llamadaDelChat(yo, chat) });
}

export async function POST(peticion: Request) {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol)) return respuesta({ error: "No encontrado" }, 404);
  if (!mismoSitio(peticion)) return respuesta({ error: "No permitido" }, 403);
  const texto = await leerCuerpo(peticion, 2048);
  let datos: { accion?: unknown; chat?: unknown; id?: unknown; sala?: unknown };
  try {
    datos = JSON.parse(texto ?? "");
  } catch {
    return respuesta({ error: "Petición no válida." }, 400);
  }
  const id = typeof datos.id === "string" ? datos.id : "";
  try {
    switch (datos.accion) {
      case "preparar":
        return respuesta({
          entrada: await prepararLlamada(yo, typeof datos.chat === "string" ? datos.chat : ""),
        });
      case "entrar":
        return respuesta(
          await entrarEnLlamada(
            yo,
            typeof datos.chat === "string" ? datos.chat : "",
            typeof datos.sala === "string" ? datos.sala : undefined,
          ),
        );
      case "latido":
        return respuesta({ sigue: await latidoLlamada(yo, id) });
      case "salir":
        await salirDeLlamada(yo, id);
        return respuesta({ ok: true });
      default:
        return respuesta({ error: "Petición no válida." }, 400);
    }
  } catch (error) {
    if (error instanceof ErrorMensaje) return respuesta({ error: error.message }, 400);
    throw error;
  }
}
