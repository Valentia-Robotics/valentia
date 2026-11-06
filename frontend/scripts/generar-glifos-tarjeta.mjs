/**
 * Genera src/lib/tarjetaLaser/glifos.json: el contorno de cada letra de las tipografías de la marca
 * (Jost, Inter y JetBrains Mono) para escribir los textos de las tarjetas láser como formas,
 * sin depender de que el programa del láser tenga las tipografías.
 *
 * Solo hace falta volver a ejecutarlo si se cambian las tipografías o faltan letras.
 * Las librerías que usa NO están en el proyecto: se instalan un momento sin guardarlas:
 *
 *   npm install --no-save opentype.js @fontsource/jost @fontsource/inter @fontsource/jetbrains-mono
 *   node scripts/generar-glifos-tarjeta.mjs
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import opentype from "opentype.js";

const require = createRequire(import.meta.url);
const SALIDA = "src/lib/tarjetaLaser/glifos.json";

// Letras disponibles: ASCII imprimible + las de español y las más comunes de otros idiomas europeos
const LETRAS = [
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
  ..."ÁÉÍÓÚÜÑáéíóúüñ¿¡«»ÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÄËÏÖäëïöÇç€·–—‘’“”…ºª",
];

const FUENTES = {
  titulo: ["@fontsource/jost", "jost-latin-500-normal.woff"],
  texto: ["@fontsource/inter", "inter-latin-400-normal.woff"],
  textoMedio: ["@fontsource/inter", "inter-latin-500-normal.woff"],
  mono: ["@fontsource/jetbrains-mono", "jetbrains-mono-latin-600-normal.woff"],
};

const redondear = (n) => Math.round(n);

const resultado = {};
for (const [nombre, [paquete, archivo]] of Object.entries(FUENTES)) {
  const datos = fs.readFileSync(require.resolve(`${paquete}/files/${archivo}`));
  const fuente = opentype.parse(
    datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.length),
  );
  const em = fuente.unitsPerEm;
  const glifos = {};
  const presentes = [];
  for (const letra of LETRAS) {
    const glifo = fuente.charToGlyph(letra);
    if (!glifo || glifo.index === 0) continue;
    presentes.push([letra, glifo]);
    // Contorno a tamaño 1 em, con la línea base en y = 0 y la y hacia abajo (como en SVG)
    const comandos = glifo.getPath(0, 0, em).commands.map((c) => {
      if (c.type === "M" || c.type === "L") return [c.type, redondear(c.x), redondear(c.y)];
      if (c.type === "Q")
        return ["Q", redondear(c.x1), redondear(c.y1), redondear(c.x), redondear(c.y)];
      if (c.type === "C") return ["C", ...[c.x1, c.y1, c.x2, c.y2, c.x, c.y].map(redondear)];
      return ["Z"];
    });
    glifos[letra] = { a: glifo.advanceWidth, c: comandos };
  }
  // Interletraje (kerning) solo de las parejas que lo tienen
  const kerning = {};
  for (const [a, ga] of presentes)
    for (const [b, gb] of presentes) {
      const k = fuente.getKerningValue(ga, gb);
      if (k) kerning[a + b] = k;
    }
  resultado[nombre] = { em, glifos, kerning };
  console.log(
    `${nombre}: ${presentes.length} letras, ${Object.keys(kerning).length} parejas de kerning`,
  );
}

fs.writeFileSync(SALIDA, JSON.stringify(resultado));
console.log(`Escrito ${SALIDA} (${Math.round(fs.statSync(SALIDA).size / 1024)} KB)`);
