/**
 * ZIP DE TARJETAS PARA LÁSER DE UN LOTE
 * Lo usan la descarga de cada lote (/admin/codigos/lotes/[id]/laser) y la de las tarjetas de bienvenida
 * (/admin/codigos/bienvenida): mismo formato de ZIP y de nombres de archivo, para que el programa del
 * ordenador del láser los trate igual.
 */
import "server-only";
import { SLUG_KIT_BIENVENIDA } from "@/config/bienvenida";
import { urlActivacion } from "@/lib/qr";
import { tarjetaLaserSvg } from "./tarjeta";
import { crearZip } from "./zip";

const LEEME = (
  bienvenida: boolean,
) => `TARJETAS ${bienvenida ? "DE BIENVENIDA" : "DE ACTIVACIÓN"} DE VALENTIA PARA LÁSER
=============================================

Cada tarjeta tiene dos archivos, con su propio QR y código:
${
  bienvenida
    ? `  - VAL-XXXX-XXXX_delantero.svg  →  cara delantera (QR y «Bienvenidos a Valentia»)
  - VAL-XXXX-XXXX_trasero.svg    →  cara trasera (pasos para ver el vídeo y el código)
La cara trasera lleva escrito el código: graba las dos caras del MISMO código en
la misma tarjeta.`
    : `  - VAL-XXXX-XXXX_delantero.svg  →  cara delantera (QR, código y nombre del kit)
  - VAL-XXXX-XXXX_trasero.svg    →  cara trasera (pasos y dibujo del kit)`
}
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

interface LoteParaZip {
  kit: { nombre: string; slug: string };
  codigos: { codigo: string; desactivadoEn: Date | null }[];
}

/** ZIP con LEEME.txt y dos SVG por código (sin los desactivados), y el nombre con que se descarga */
export function zipDeLote(lote: LoteParaZip) {
  const dominio = new URL(urlActivacion("X")).host;
  const activos = lote.codigos.filter((c) => !c.desactivadoEn);
  const archivos = activos.flatMap((c) => {
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
  const bienvenida = lote.kit.slug === SLUG_KIT_BIENVENIDA;
  const zip = crearZip([{ nombre: "LEEME.txt", contenido: LEEME(bienvenida) }, ...archivos]);

  // Nombre único en cada descarga (fecha y hora de la descarga): así el programa del láser
  // del ordenador nunca confunde un ZIP con otro ni el navegador añade "(1)".
  const ahora = new Date().toISOString(); // 2026-11-05T17:09:45.123Z
  const marca = `${ahora.slice(0, 10)}_${ahora.slice(11, 19).replaceAll(":", "")}`;
  const nombre = `tarjetas-laser-${lote.kit.slug}-${activos.length}uds-${marca}.zip`;
  return { zip, nombre };
}

/** Respuesta HTTP que descarga el ZIP */
export function respuestaZip({ zip, nombre }: ReturnType<typeof zipDeLote>) {
  return new Response(new Blob([zip as BlobPart]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
