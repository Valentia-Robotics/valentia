/**
 * DESCARGA DE TARJETAS PARA LÁSER: /admin/codigos/lotes/[id]/laser
 * Devuelve un .zip con dos SVG por cada código del lote (los desactivados no se incluyen):
 * CODIGO_delantero.svg (QR, código y nombre del kit) y CODIGO_trasero.svg (pasos y dibujo del kit).
 */
import { obtenerLote } from "@/lib/admin/codigos";
import { esId } from "@/lib/ids";
import { urlActivacion } from "@/lib/qr";
import { obtenerUsuario } from "@/lib/sesion";
import { tarjetaLaserSvg } from "@/lib/tarjetaLaser/tarjeta";
import { crearZip } from "@/lib/tarjetaLaser/zip";

const LEEME = `TARJETAS DE ACTIVACIÓN DE VALENTIA PARA LÁSER
=============================================

Cada tarjeta tiene dos archivos, con su propio QR y código:
  - VAL-XXXX-XXXX_delantero.svg  →  cara delantera (QR, código y nombre del kit)
  - VAL-XXXX-XXXX_trasero.svg    →  cara trasera (pasos y dibujo del kit)
Medidas reales: 85,6 × 54 mm por cara.

  - Relleno NEGRO  = GRABAR (el láser aclara la cartulina negra)
  - Línea ROJA     = CORTAR el contorno

Cómo hacerla:
  1. Abre el archivo _delantero, graba y corta el contorno.
  2. Sin mover la plancha, da la vuelta a la tarjeta y vuelve a meterla en su hueco.
  3. Abre el archivo _trasero del MISMO código, colócalo en el mismo sitio y graba
     solo la cara trasera (desactiva el corte: la tarjeta ya está cortada).
  4. Antes de hacer muchas, prueba una y comprueba que el QR se lee con el móvil.
`;

export async function GET(_peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  // Solo administradores; para los demás, como si no existiera
  const usuario = await obtenerUsuario();
  if (usuario?.rol !== "ADMIN") return new Response("No encontrado", { status: 404 });

  const { id } = await params;
  // Con MongoDB, un id mal formado haría fallar la consulta: se trata como "no existe"
  if (!esId(id)) return new Response("No encontrado", { status: 404 });
  const lote = await obtenerLote(id);
  if (!lote) return new Response("No encontrado", { status: 404 });

  const dominio = new URL(urlActivacion("X")).host;
  const archivos = lote.codigos
    .filter((c) => !c.desactivadoEn)
    .flatMap((c) => {
      const datos = {
        codigo: c.codigo,
        nombreKit: lote.kit.nombre,
        slugKit: lote.kit.slug,
        url: urlActivacion(c.codigo),
        dominio,
      };
      return [
        { nombre: `${c.codigo}_delantero.svg`, contenido: tarjetaLaserSvg(datos, "delantera") },
        { nombre: `${c.codigo}_trasero.svg`, contenido: tarjetaLaserSvg(datos, "trasera") },
      ];
    });
  const zip = crearZip([{ nombre: "LEEME.txt", contenido: LEEME }, ...archivos]);

  const fecha = lote.creadoEn.toISOString().slice(0, 10);
  const nombreZip = `tarjetas-laser-${lote.kit.slug}-${fecha}.zip`;
  return new Response(new Blob([zip as BlobPart]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nombreZip}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
