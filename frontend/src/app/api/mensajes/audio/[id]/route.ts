/**
 * OÍR UNA NOTA DE VOZ DE LOS MENSAJES: GET /api/mensajes/audio/<id del mensaje>
 * Solo quien puede ver ese chat (un grupo, sus miembros; un privado, sus dos personas). A los
 * demás, 404, como si no existiera.
 * Atiende peticiones por trozos (Range → 206): Safari, en el iPhone y en el Mac, no reproduce un
 * audio si el servidor no las admite.
 */
import { esDelEquipo } from "@/config/equipo";
import { leerPrivado } from "@/lib/almacenamiento/privado";
import { audioVisible } from "@/lib/mensajes/mensajes";
import { obtenerUsuario } from "@/lib/sesion";
import { trozoPedido } from "@/lib/mensajes/trozos";

const noEncontrado = () =>
  new Response("No encontrado", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

export async function GET(peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol)) return noEncontrado();
  const audio = await audioVisible(yo, (await params).id);
  if (!audio) return noEncontrado();
  const flujo = await leerPrivado(audio.clave);
  if (!flujo) return noEncontrado();
  // Una nota de voz pesa poco (8 MB como mucho): se lee entera y se sirve el trozo que pidan
  const datos = new Uint8Array(await new Response(flujo).arrayBuffer());

  const cabeceras: Record<string, string> = {
    "Content-Type": audio.tipo,
    "Content-Disposition": "inline",
    "Accept-Ranges": "bytes",
    // Una nota de voz nunca cambia: el navegador la guarda (solo él, no proxies)
    "Cache-Control": "private, max-age=604800, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  };
  const trozo = trozoPedido(peticion.headers.get("range"), datos.length);
  if (trozo === "no-vale") {
    return new Response(null, {
      status: 416,
      headers: { ...cabeceras, "Content-Range": `bytes */${datos.length}` },
    });
  }
  if (trozo) {
    return new Response(datos.slice(trozo.inicio, trozo.fin + 1), {
      status: 206,
      headers: {
        ...cabeceras,
        "Content-Range": `bytes ${trozo.inicio}-${trozo.fin}/${datos.length}`,
        "Content-Length": String(trozo.fin - trozo.inicio + 1),
      },
    });
  }
  return new Response(datos, {
    headers: { ...cabeceras, "Content-Length": String(datos.length) },
  });
}
