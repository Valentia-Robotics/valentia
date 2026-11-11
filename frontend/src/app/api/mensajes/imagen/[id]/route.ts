/**
 * VER UNA IMAGEN DE LOS MENSAJES: GET /api/mensajes/imagen/<id del mensaje>
 * Solo quien puede ver ese chat (el General, el equipo; un privado, sus dos personas). A los demás,
 * 404, como si no existiera. Siempre WebP (lo genera el servidor), sin que el navegador adivine el tipo.
 */
import { esDelEquipo } from "@/config/equipo";
import { leerPrivado } from "@/lib/almacenamiento/privado";
import { imagenVisible } from "@/lib/mensajes/mensajes";
import { obtenerUsuario } from "@/lib/sesion";

const noEncontrado = () =>
  new Response("No encontrado", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

export async function GET(_peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol)) return noEncontrado();
  const clave = await imagenVisible(yo, (await params).id);
  if (!clave) return noEncontrado();
  const cuerpo = await leerPrivado(clave);
  if (!cuerpo) return noEncontrado();

  return new Response(cuerpo, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Disposition": "inline",
      // La imagen de un mensaje nunca cambia: el navegador la guarda (solo él, no proxies)
      "Cache-Control": "private, max-age=604800, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
