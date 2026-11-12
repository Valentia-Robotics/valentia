/**
 * MODELOS 3D PROVISIONALES DE LAS PIEZAS
 * Guarda cada pieza de scripts/fotos-piezas/modelos.ts como public/modelos/componentes/<slug>.glb, para
 * que el configurador ya las enseñe en 3D. Cuando llegue el modelo real de una pieza (Alonso), se pone
 * con el mismo nombre (o .stl/.obj, borrando el .glb) y manda ese.
 *
 *   npm run modelos:glb                  → todas (no pisa las que no estén en modelos.ts)
 *   npm run modelos:glb -- servo-sg90    → solo esa
 *   npm run modelos:glb -- --kits        → los kits montados, en public/modelos/kits (ficha de cada kit)
 *
 * Usa Chrome (sin ventana), igual que npm run fotos:piezas.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

const RAIZ = path.resolve(import.meta.dirname, "..");
const deKits = process.argv.includes("--kits");
const SALIDA = path.join(RAIZ, deKits ? "public/modelos/kits" : "public/modelos/componentes");
const elegidas = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const { outputFiles } = await build({
  entryPoints: [path.join(RAIZ, "scripts/fotos-piezas/exportarGlb.ts")],
  bundle: true,
  format: "iife",
  write: false,
  logLevel: "warning",
});

const navegador = await chromium.launch({
  ...(process.env.CHROME_RUTA
    ? { executablePath: process.env.CHROME_RUTA }
    : process.env.CHROME_PLAYWRIGHT
      ? {}
      : { channel: "chrome" }),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const pagina = await navegador.newPage();
pagina.on("pageerror", (e) => console.error("Error:", e.message));
await pagina.setContent("<!doctype html><html><body></body></html>");
await pagina.addScriptTag({ content: outputFiles[0].text });

const todas = await pagina.evaluate((k) => (k ? window.kits : window.piezas), deKits);
await mkdir(SALIDA, { recursive: true });
for (const slug of elegidas.length ? elegidas : todas) {
  if (!todas.includes(slug)) {
    console.error(`✗ ${slug}: no existe ese modelo`);
    continue;
  }
  const datos = Buffer.from(await pagina.evaluate((s) => window.exportar(s), slug), "base64");
  await writeFile(path.join(SALIDA, `${slug}.glb`), datos);
  console.log(`✓ ${slug} (${Math.round(datos.length / 1024)} KB)`);
}
await navegador.close();
