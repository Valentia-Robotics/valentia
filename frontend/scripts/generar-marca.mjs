/**
 * Genera todos los archivos de marca de Valentia a partir de los originales.
 *
 * Uso:  npm run marca
 *
 * Lee (NO modifica):
 *   - imagenes/logo.png                    → tu logo original
 *   - public/images/brand/monograma.svg    → la "V" para favicon e iconos
 *
 * Crea:
 *   - public/images/brand/logo.png         → copia exacta del original
 *   - public/images/brand/logo-negro.png   → recortado, letras negras, fondo transparente
 *   - public/images/brand/logo-blanco.png  → recortado, letras blancas, fondo transparente
 *   - public/images/brand/icono-192.png, icono-512.png → iconos para el manifest (móviles)
 *   - src/app/icon.png (192), src/app/apple-icon.png (180), src/app/favicon.ico (16/32/48)
 *     (Google pide un icono cuadrado de un múltiplo de 48 px: 48, 96, 144, 192…)
 *
 * Si cambias el logo: sustituye imagenes/logo.png y vuelve a ejecutar "npm run marca".
 */
import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ruta = (...partes) => path.join(raiz, ...partes);

// Tu logo original vive en la raíz del repositorio, fuera de frontend/
const ORIGINAL = ruta("..", "imagenes", "logo.png");
const MONOGRAMA = ruta("public", "images", "brand", "monograma.svg");
const BRAND = ruta("public", "images", "brand");
const APP = ruta("src", "app");

const TINTA = { r: 11, g: 11, b: 11 }; // #0B0B0B, el negro del logo
const BLANCO = { r: 255, g: 255, b: 255 };

/** Busca el rectángulo donde están las letras (píxeles oscuros) y añade un margen. */
async function calcularRecorte(margen = 24) {
  const { data, info } = await sharp(ORIGINAL)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width,
    minY = info.height,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const left = Math.max(0, minX - margen);
  const top = Math.max(0, minY - margen);
  return {
    left,
    top,
    width: Math.min(info.width, maxX + margen + 1) - left,
    height: Math.min(info.height, maxY + margen + 1) - top,
  };
}

/** Crea una versión del logo recortada, con fondo transparente y del color indicado. */
async function logoTransparente(recorte, color, destino) {
  // La transparencia sale de lo oscuro que es cada píxel: letras = opaco, fondo blanco = transparente.
  // linear() limpia el "ruido" casi blanco del fondo original.
  const alfa = await sharp(ORIGINAL)
    .extract(recorte)
    .grayscale()
    .negate()
    .linear(1.15, -18)
    .raw()
    .toBuffer();

  await sharp({
    create: { width: recorte.width, height: recorte.height, channels: 3, background: color },
  })
    .joinChannel(alfa, { raw: { width: recorte.width, height: recorte.height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(destino);
}

/** Crea un .ico (formato clásico de favicon) que contiene varias imágenes PNG. */
function crearIco(pngs) {
  const cabecera = Buffer.alloc(6);
  cabecera.writeUInt16LE(0, 0); // reservado
  cabecera.writeUInt16LE(1, 2); // tipo: icono
  cabecera.writeUInt16LE(pngs.length, 4);

  const entradas = [];
  let desplazamiento = 6 + 16 * pngs.length;
  for (const { tamano, datos } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(tamano >= 256 ? 0 : tamano, 0); // ancho
    e.writeUInt8(tamano >= 256 ? 0 : tamano, 1); // alto
    e.writeUInt8(0, 2); // paleta
    e.writeUInt8(0, 3); // reservado
    e.writeUInt16LE(1, 4); // planos
    e.writeUInt16LE(32, 6); // bits por píxel
    e.writeUInt32LE(datos.length, 8);
    e.writeUInt32LE(desplazamiento, 12);
    desplazamiento += datos.length;
    entradas.push(e);
  }
  return Buffer.concat([cabecera, ...entradas, ...pngs.map((p) => p.datos)]);
}

async function main() {
  // 1. Copia exacta del original a la carpeta pública
  await copyFile(ORIGINAL, path.join(BRAND, "logo.png"));

  // 2. Versiones recortadas y transparentes (para fondos claros y oscuros)
  const recorte = await calcularRecorte();
  await logoTransparente(recorte, TINTA, path.join(BRAND, "logo-negro.png"));
  await logoTransparente(recorte, BLANCO, path.join(BRAND, "logo-blanco.png"));

  // 3. Iconos a partir del monograma "V"
  const svg = await readFile(MONOGRAMA);
  const png = (tamano) => sharp(svg, { density: 300 }).resize(tamano, tamano).png().toBuffer();

  await writeFile(path.join(BRAND, "icono-192.png"), await png(192));
  await writeFile(path.join(BRAND, "icono-512.png"), await png(512));
  await writeFile(path.join(APP, "icon.png"), await png(192));
  await writeFile(path.join(APP, "apple-icon.png"), await png(180));

  const tamanosIco = [16, 32, 48];
  const pngsIco = await Promise.all(
    tamanosIco.map(async (tamano) => ({ tamano, datos: await png(tamano) })),
  );
  await writeFile(path.join(APP, "favicon.ico"), crearIco(pngsIco));

  console.log("Marca generada. Recorte del logo:", recorte);
}

main().catch((error) => {
  console.error("Error generando la marca:", error);
  process.exit(1);
});
