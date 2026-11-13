/**
 * BUSCAR GIFs PARA EL CHAT: GET /api/mensajes/gifs?q=<texto>&desde=<n>&tipo=<gifs|stickers>
 * Solo para el equipo. Sin texto devuelve los GIFs del momento. La búsqueda la hace el servidor
 * con la clave de GIPHY (GIPHY_API_KEY), que así nunca llega al navegador.
 * Sin clave responde 503 con «sinClave»: el selector explica cómo activarlos.
 */
import { esDelEquipo } from "@/config/equipo";
import { leerTipoGif, limpiarBusquedaGif } from "@/config/gifs";
import { registrarIntento } from "@/lib/limite";
import { buscarGifs, hayGifs } from "@/lib/mensajes/gifs";
import { ErrorMensaje } from "@/lib/mensajes/mensajes";
import { obtenerUsuario } from "@/lib/sesion";

const respuesta = (cuerpo: object, status: number) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(peticion: Request) {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol)) return respuesta({ error: "No encontrado" }, 404);
  if (!hayGifs())
    return respuesta({ sinClave: true, error: "Los GIFs aún no están activados." }, 503);

  const parametros = new URL(peticion.url).searchParams;
  const busqueda = limpiarBusquedaGif(parametros.get("q") ?? "");
  const desde = Math.max(0, Math.floor(Number(parametros.get("desde")) || 0));
  if (!(await registrarIntento("gifBusqueda", yo.id)))
    return respuesta({ error: "Has buscado muchos GIFs seguidos. Espera un poco." }, 429);

  try {
    const tipo = leerTipoGif(parametros.get("tipo"));
    return respuesta({ gifs: await buscarGifs(busqueda, desde, tipo) }, 200);
  } catch (error) {
    if (error instanceof ErrorMensaje) return respuesta({ error: error.message }, 502);
    console.error("[gifs] Error al buscar GIFs.", error);
    return respuesta({ error: "No se han podido cargar los GIFs." }, 500);
  }
}
