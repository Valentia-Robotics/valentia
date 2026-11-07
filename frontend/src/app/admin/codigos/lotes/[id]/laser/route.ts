/**
 * DESCARGA DE TARJETAS PARA LÁSER: /admin/codigos/lotes/[id]/laser
 * Devuelve un .zip con dos SVG por cada código del lote (los desactivados no se incluyen):
 * CODIGO_delantero.svg y CODIGO_trasero.svg, solo para grabar (la tarjeta ya viene cortada).
 * Si el lote es del kit de bienvenida, las tarjetas llevan el diseño de bienvenida.
 */
import { obtenerLote } from "@/lib/admin/codigos";
import { esId } from "@/lib/ids";
import { obtenerUsuario } from "@/lib/sesion";
import { respuestaZip, zipDeLote } from "@/lib/tarjetaLaser/zipLote";

export async function GET(_peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  // Solo administradores; para los demás, como si no existiera
  const usuario = await obtenerUsuario();
  if (usuario?.rol !== "ADMIN") return new Response("No encontrado", { status: 404 });

  const { id } = await params;
  // Con MongoDB, un id mal formado haría fallar la consulta: se trata como "no existe"
  if (!esId(id)) return new Response("No encontrado", { status: 404 });
  const lote = await obtenerLote(id);
  if (!lote) return new Response("No encontrado", { status: 404 });

  return respuestaZip(zipDeLote(lote));
}
