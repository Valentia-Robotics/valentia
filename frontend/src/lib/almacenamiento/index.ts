/**
 * ALMACENAMIENTO DE IMÁGENES SUBIDAS DESDE EL PANEL
 * Elige el almacén según ALMACEN_PROVEEDOR en .env:
 *   "local" (por defecto) → carpeta subidas/ del proyecto
 *   "nube"                → servicio en la nube (ver nube.ts para activarlo)
 *
 * El resto de la web solo usa subirImagen() y borrarImagen(): para cambiar de
 * almacén no hay que tocar nada más.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { almacenLocal } from "./local";
import { almacenNube } from "./nube";
import type { Almacen } from "./tipos";

function almacen(): Almacen {
  return process.env.ALMACEN_PROVEEDOR === "nube" ? almacenNube : almacenLocal;
}

/** Formatos de foto que se aceptan (SVG no: puede llevar código escondido) */
const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
/** Tamaño máximo de cada foto (también hay un límite en next.config.ts) */
export const MAXIMO_MB = 5;
/** Lado más largo de la foto ya reducida, en píxeles */
const LADO_MAXIMO = 1600;

/** Error con un mensaje que se puede enseñar tal cual en el formulario */
export class ErrorImagen extends Error {}

/** true si el formulario trae un archivo de verdad (un campo vacío llega como archivo de 0 bytes) */
export function hayArchivo(valor: FormDataEntryValue | null): valor is File {
  return typeof valor === "object" && valor !== null && valor.size > 0;
}

/**
 * Comprueba la foto, la reduce (máximo 1600 px de lado), la convierte a WebP (pesa mucho menos)
 * y la guarda. Devuelve la dirección pública de la imagen.
 * "carpeta" agrupa las fotos: "componentes", "kits"…
 */
export async function subirImagen(archivo: File, carpeta: string): Promise<string> {
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    throw new ErrorImagen("La foto tiene que ser JPG, PNG o WebP.");
  }
  if (archivo.size > MAXIMO_MB * 1024 * 1024) {
    throw new ErrorImagen(`La foto pesa demasiado (máximo ${MAXIMO_MB} MB).`);
  }

  let datos: Buffer;
  try {
    // limitInputPixels: rechaza imágenes gigantes hechas para colgar el servidor (40 megapíxeles)
    datos = await sharp(Buffer.from(await archivo.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate() // respeta la orientación de las fotos hechas con el móvil
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ErrorImagen("No hemos podido leer la foto. ¿Seguro que es una imagen?");
  }

  // Nombre al azar: nadie puede adivinarlo ni pisar una foto que ya existe
  const nombre = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.webp`;
  return almacen().guardar(`${carpeta}/${nombre}`, datos, "image/webp");
}

/** Borra una foto subida. Las imágenes de muestra (/images/…) nunca se borran. */
export async function borrarImagen(url: string | null | undefined): Promise<void> {
  if (url) await almacen().borrar(url);
}
