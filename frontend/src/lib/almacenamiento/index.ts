/**
 * ALMACENAMIENTO DE IMÁGENES SUBIDAS DESDE EL PANEL
 * Elige el almacén según ALMACEN_PROVEEDOR en .env:
 *   "local" (por defecto) → carpeta subidas/ del proyecto
 *   "nube"                → servicio en la nube (ver nube.ts para activarlo)
 * Sin bucket público ni disco propio, y con el almacén privado configurado (o en Render), las fotos
 * van al almacén privado con la misma dirección /subidas/… (ver publicoEnPrivado.ts): el disco de
 * Render se vacía en cada publicación y las fotos se perdían.
 *
 * El resto de la web solo usa subirImagen() y borrarImagen(): para cambiar de
 * almacén no hay que tocar nada más.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { almacenLocal } from "./local";
import { almacenNube } from "./nube";
import { ErrorAlmacenPrivado } from "./privado";
import { almacenPublicoEnPrivado, usarAlmacenPrivadoParaFotos } from "./publicoEnPrivado";
import type { Almacen } from "./tipos";

function almacen(): Almacen {
  if (process.env.ALMACEN_PROVEEDOR === "nube") return almacenNube;
  return usarAlmacenPrivadoParaFotos() ? almacenPublicoEnPrivado : almacenLocal;
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
 * Comprueba la foto, la reduce (máximo 1600 px de lado) y la convierte a WebP (pesa mucho menos).
 * Con "cuadrada" (píxeles), la recorta en un cuadrado de ese lado (fotos de perfil).
 * Devuelve los bytes del WebP, todavía sin guardar.
 */
export async function prepararImagen(
  archivo: File,
  { cuadrada }: { cuadrada?: number } = {},
): Promise<Buffer> {
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    throw new ErrorImagen("La foto tiene que ser JPG, PNG o WebP.");
  }
  if (archivo.size > MAXIMO_MB * 1024 * 1024) {
    throw new ErrorImagen(`La foto pesa demasiado (máximo ${MAXIMO_MB} MB).`);
  }

  try {
    // limitInputPixels: rechaza imágenes gigantes hechas para colgar el servidor (40 megapíxeles)
    return await sharp(Buffer.from(await archivo.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate() // respeta la orientación de las fotos hechas con el móvil
      .resize(
        cuadrada
          ? { width: cuadrada, height: cuadrada, fit: "cover", position: "attention" }
          : { width: LADO_MAXIMO, height: LADO_MAXIMO, fit: "inside", withoutEnlargement: true },
      )
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ErrorImagen("No hemos podido leer la foto. ¿Seguro que es una imagen?");
  }
}

/** Nombre al azar: nadie puede adivinarlo ni pisar una foto que ya existe */
export function nombreAlAzar(): string {
  return `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.webp`;
}

/**
 * Prepara la foto (ver prepararImagen) y la guarda. Devuelve la dirección pública de la imagen.
 * "carpeta" agrupa las fotos: "componentes", "kits"…
 */
export async function subirImagen(
  archivo: File,
  carpeta: string,
  opciones: { cuadrada?: number } = {},
): Promise<string> {
  const datos = await prepararImagen(archivo, opciones);
  try {
    return await almacen().guardar(`${carpeta}/${nombreAlAzar()}`, datos, "image/webp");
  } catch (error) {
    // Por ejemplo, en Render sin bucket: mejor avisar que guardar una foto que se perderá
    if (error instanceof ErrorAlmacenPrivado) throw new ErrorImagen(error.message);
    throw error;
  }
}

/** Borra una foto subida. Las imágenes de muestra (/images/…) nunca se borran. */
export async function borrarImagen(url: string | null | undefined): Promise<void> {
  if (url) await almacen().borrar(url);
}
