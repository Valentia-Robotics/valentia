/**
 * FOTOS DE LAS PIEZAS DEL CONFIGURADOR
 * Hace una foto de estudio en 3D de cada pieza (scripts/fotos-piezas/) y la guarda en
 * public/images/componentes/<slug>.svg, el mismo archivo que ya usa la tienda: así no hay
 * que cambiar nada en la base de datos. El SVG lleva dentro la foto (WebP).
 *
 *   npm run fotos:piezas                 → todas
 *   npm run fotos:piezas -- servo-sg90   → solo esa (o varias separadas por espacios)
 *   npm run fotos:piezas -- --prueba     → las deja en .fotos-prueba/ (PNG) sin tocar la web
 *
 * Usa Chrome (sin ventana) para dibujar el 3D.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const RAIZ = path.resolve(import.meta.dirname, "..");
const SALIDA = path.join(RAIZ, "public/images/componentes");
const PRUEBA = path.join(RAIZ, ".fotos-prueba");
const LADO_FINAL = 800;

const argumentos = process.argv.slice(2);
const prueba = argumentos.includes("--prueba");
const elegidas = argumentos.filter((a) => !a.startsWith("--"));

// 1. Empaquetar el estudio (three + modelos) en un solo script para el navegador
const { outputFiles } = await build({
  entryPoints: [path.join(RAIZ, "scripts/fotos-piezas/estudio.ts")],
  bundle: true,
  format: "iife",
  write: false,
  logLevel: "warning",
});

// 2. Abrir el navegador (con WebGL por software, funciona en cualquier ordenador)
// Como en las pruebas (playwright.config.ts), usa el Chrome del ordenador; con la variable
// CHROME_RUTA se puede indicar otro navegador.
const navegador = await chromium.launch({
  ...(process.env.CHROME_RUTA
    ? { executablePath: process.env.CHROME_RUTA }
    : { channel: "chrome" }),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const pagina = await navegador.newPage();
pagina.on("pageerror", (e) => console.error("Error en el estudio:", e.message));
await pagina.setContent(
  "<!doctype html><html><body style='margin:0;background:transparent'></body></html>",
);
await pagina.addScriptTag({ content: outputFiles[0].text });

const todas = await pagina.evaluate(() => window.piezas);
const lista = elegidas.length ? elegidas : todas;
await mkdir(prueba ? PRUEBA : SALIDA, { recursive: true });

// 3. Una foto por pieza
for (const slug of lista) {
  if (!todas.includes(slug)) {
    console.error(`✗ ${slug}: no existe ese modelo`);
    continue;
  }
  const inicio = Date.now();
  const datos = await pagina.evaluate((s) => window.fotografiar(s), slug);
  const png = Buffer.from(datos.split(",")[1], "base64");
  const imagen = sharp(png).resize(LADO_FINAL, LADO_FINAL, { kernel: "lanczos3" });
  if (prueba) {
    await imagen.png().toFile(path.join(PRUEBA, `${slug}.png`));
  } else {
    const webp = await imagen.webp({ quality: 86, alphaQuality: 90, effort: 6 }).toBuffer();
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO_FINAL} ${LADO_FINAL}">` +
      `<!-- Foto de estudio generada con npm run fotos:piezas (scripts/fotos-piezas). -->` +
      `<image width="${LADO_FINAL}" height="${LADO_FINAL}" href="data:image/webp;base64,${webp.toString("base64")}"/></svg>\n`;
    await writeFile(path.join(SALIDA, `${slug}.svg`), svg);
  }
  console.log(`✓ ${slug} (${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
}

await navegador.close();
