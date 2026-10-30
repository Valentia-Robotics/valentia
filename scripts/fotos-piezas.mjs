/**
 * FOTOS DE LAS PIEZAS DEL CONFIGURADOR
 * Hace una foto de estudio en 3D de cada pieza (scripts/fotos-piezas/) y la guarda en
 * public/images/componentes/<slug>.svg, el mismo archivo que ya usa la tienda: así no hay
 * que cambiar nada en la base de datos. El SVG lleva dentro la foto (WebP).
 *
 *   npm run fotos:piezas                 → todas
 *   npm run fotos:piezas -- servo-sg90   → solo esa (o varias separadas por espacios)
 *   npm run fotos:piezas -- --prueba     → las deja en .fotos-prueba/ (PNG) sin tocar la web
 *   npm run fotos:piezas -- --kits [slug] [--prueba] → fotos de los kits: public/images/kits/<slug>.svg (ficha y listado)
 *                                          y public/images/redes/kits/<slug>.png (al compartir en redes)
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
const soloKits = argumentos.includes("--kits");
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

// Fotos de los kits: SVG 4:3 con la foto dentro (mismas rutas que ya usa la BD) y PNG para las redes
if (soloKits) {
  const kits = await pagina.evaluate(() => window.kits);
  const carpetaRedes = path.join(RAIZ, "public/images/redes/kits");
  await mkdir(carpetaRedes, { recursive: true });
  for (const slug of elegidas.length ? kits.filter((k) => elegidas.includes(k)) : kits) {
    const datos = await pagina.evaluate((s) => window.fotografiar(s), slug);
    const recortada = await sharp(Buffer.from(datos.split(",")[1], "base64"))
      .trim({ threshold: 1 })
      .toBuffer();
    if (prueba) {
      await mkdir(PRUEBA, { recursive: true });
      await sharp(recortada)
        .png()
        .toFile(path.join(PRUEBA, `kit-${slug}.png`));
      console.log(`✓ prueba kit ${slug}`);
      continue;
    }
    await sharp(recortada)
      .resize({ width: 1000 })
      .png({ compressionLevel: 9 })
      .toFile(path.join(carpetaRedes, `${slug}.png`));
    // En la web, 800 × 600 con aire alrededor (como las ilustraciones que sustituye)
    const webp = await sharp(recortada)
      .resize(720, 520, { fit: "inside" })
      .extend({
        top: 40,
        bottom: 40,
        left: 40,
        right: 40,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .resize(800, 600, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 86, alphaQuality: 90, effort: 6 })
      .toBuffer();
    await writeFile(
      path.join(RAIZ, "public/images/kits", `${slug}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">` +
        `<!-- Foto de estudio de un kit, generada con scripts/fotos-piezas (opción kits). En un comentario XML no puede haber dos guiones seguidos. -->` +
        `<image width="800" height="600" href="data:image/webp;base64,${webp.toString("base64")}"/></svg>\n`,
    );
    console.log(`✓ kit ${slug}`);
  }
  await navegador.close();
  process.exit(0);
}
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
