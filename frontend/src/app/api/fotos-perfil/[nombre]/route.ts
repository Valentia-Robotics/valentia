/**
 * VER UNA FOTO DE PERFIL: GET /api/fotos-perfil/<id>
 * La puede ver cualquiera con sesión (el equipo ve las de todos en los mensajes). Cada foto nueva
 * tiene otra dirección, así que el navegador la guarda un año y no la vuelve a pedir: va fluido.
 * Las del 11-11-2026 (/api/fotos-perfil/<nombre>.webp) están en el almacén privado y se siguen viendo.
 */
import { leerRutaFoto } from "@/lib/almacenamiento/fotoPerfil";
import { leerPrivado } from "@/lib/almacenamiento/privado";
import { db } from "@/lib/db";
import { obtenerUsuario } from "@/lib/sesion";

const noEncontrado = () =>
  new Response("No encontrado", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

const CABECERAS = {
  "Content-Type": "image/webp",
  "Content-Disposition": "inline",
  // Solo el navegador la guarda (no proxies); nunca cambia en esta dirección
  "Cache-Control": "private, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

export async function GET(_peticion: Request, { params }: { params: Promise<{ nombre: string }> }) {
  const ruta = leerRutaFoto((await params).nombre);
  if (!ruta || !(await obtenerUsuario())) return noEncontrado();

  if (ruta.tipo === "bd") {
    const foto = await db.fotoPerfil.findUnique({
      where: { id: ruta.id },
      select: { datos: true },
    });
    if (!foto) return noEncontrado();
    return new Response(new Uint8Array(foto.datos), {
      headers: { ...CABECERAS, "Content-Length": String(foto.datos.length) },
    });
  }

  const cuerpo = await leerPrivado(ruta.clave).catch(() => null);
  if (!cuerpo) return noEncontrado();
  return new Response(cuerpo, { headers: CABECERAS });
}
