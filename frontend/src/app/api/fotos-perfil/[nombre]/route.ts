/**
 * VER UNA FOTO DE PERFIL: GET /api/fotos-perfil/<nombre>.webp
 * La puede ver cualquiera con sesión (el equipo ve las de todos en los mensajes). El nombre es al
 * azar, así que no se puede adivinar. Siempre WebP (lo genera el servidor).
 */
import { leerPrivado } from "@/lib/almacenamiento/privado";
import { claveFotoPerfil } from "@/lib/almacenamiento/fotoPerfil";
import { obtenerUsuario } from "@/lib/sesion";

const noEncontrado = () =>
  new Response("No encontrado", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

export async function GET(_peticion: Request, { params }: { params: Promise<{ nombre: string }> }) {
  const clave = claveFotoPerfil((await params).nombre);
  if (!clave || !(await obtenerUsuario())) return noEncontrado();
  const cuerpo = await leerPrivado(clave).catch(() => null);
  if (!cuerpo) return noEncontrado();

  return new Response(cuerpo, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Disposition": "inline",
      // Cada foto nueva tiene otro nombre: el navegador la puede guardar (solo él, no proxies)
      "Cache-Control": "private, max-age=604800, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
