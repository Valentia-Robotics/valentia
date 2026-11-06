/**
 * DESCARGA DE TARJETAS PARA LÁSER: /admin/codigos/lotes/[id]/laser
 * Devuelve un .zip con dos SVG por cada código del lote (los desactivados no se incluyen):
 * CODIGO_delantero.svg (QR, código y nombre del kit) y CODIGO_trasero.svg (pasos y dibujo del kit),
 * solo para grabar (la tarjeta ya viene cortada).
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
Solo GRABADO, sin cortes: la tarjeta ya viene cortada (85,6 × 54 mm).

  - Relleno NEGRO = GRABAR (el láser aclara la cartulina negra)
  - Cada SVG mide exactamente 85,6 × 54 mm, como la tarjeta.
  - El dibujo lleva 4 escuadras finas en las esquinas, a 2 mm del borde: en el
    programa del láser el diseño mide 81,9 × 50,3 mm. Centra ese diseño sobre la
    tarjeta y quedará a la misma distancia de los cuatro bordes.
  - Todas las formas están ya unidas, sin solapes ni líneas cruzadas.

Cómo hacerla:
  1. Coloca la tarjeta, abre el archivo _delantero, céntralo sobre ella y graba.
  2. Dale la vuelta a la tarjeta (girándola de lado, como una página) y vuelve a
     ponerla en el mismo sitio.
  3. Abre el archivo _trasero del MISMO código, céntralo igual y graba.
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

  // Nombre único en cada descarga (fecha y hora de la descarga): así el programa del láser
  // del ordenador nunca confunde un ZIP con otro ni el navegador añade "(1)".
  const ahora = new Date().toISOString(); // 2026-11-05T17:09:45.123Z
  const marca = `${ahora.slice(0, 10)}_${ahora.slice(11, 19).replaceAll(":", "")}`;
  const nombreZip = `tarjetas-laser-${lote.kit.slug}-${lote.codigos.filter((c) => !c.desactivadoEn).length}uds-${marca}.zip`;
  return new Response(new Blob([zip as BlobPart]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nombreZip}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
