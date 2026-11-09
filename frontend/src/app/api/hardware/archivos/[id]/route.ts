/**
 * DESCARGAR UN ARCHIVO DE UN ESPACIO DE HARDWARE: GET /api/hardware/archivos/<id>
 * Solo su dueño (rol HARDWARE) o un ADMIN; para los demás, como si no existiera (404).
 * Siempre como descarga y sin adivinar el tipo: un .html subido nunca se abre como página de la web.
 */
import { cabeceraDescarga } from "@/config/hardware";
import { abrirArchivo } from "@/lib/hardware/archivos";
import { obtenerUsuario } from "@/lib/sesion";

const noEncontrado = () =>
  new Response("No encontrado", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

export async function GET(_peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await obtenerUsuario();
  if (!usuario) return noEncontrado();
  const archivo = await abrirArchivo(usuario, (await params).id);
  if (!archivo) return noEncontrado();

  return new Response(archivo.cuerpo, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(archivo.tamano),
      "Content-Disposition": cabeceraDescarga(archivo.nombre),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
