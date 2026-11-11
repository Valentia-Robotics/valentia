/**
 * IMÁGENES DE LOS MENSAJES DEL EQUIPO
 * Se comprueba que de verdad es una imagen (por su contenido, no por lo que diga el navegador),
 * se reduce a 1600 px como mucho, se le quitan los datos ocultos (GPS de la cámara…) y se guarda en
 * WebP en el almacén PRIVADO (src/lib/almacenamiento/privado.ts). Nunca tiene dirección pública:
 * se ve por /api/mensajes/imagen/<id del mensaje>, que comprueba antes quién la pide.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { LADO_IMAGEN_MENSAJE } from "@/config/mensajes";
import { guardarPrivado } from "@/lib/almacenamiento/privado";
import { ErrorMensaje } from "./mensajes";

const FORMATOS = ["jpeg", "png", "webp", "gif"];

export interface ImagenGuardada {
  clave: string;
  ancho: number;
  alto: number;
}

/** Procesa y guarda la imagen. Lanza ErrorMensaje (con un texto para la pantalla) si no vale */
export async function guardarImagenMensaje(contenido: Buffer): Promise<ImagenGuardada> {
  let datos: Buffer;
  let ancho: number;
  let alto: number;
  try {
    // limitInputPixels: rechaza imágenes gigantes hechas para colgar el servidor
    const meta = await sharp(contenido, { limitInputPixels: 50_000_000 }).metadata();
    if (!meta.format || !FORMATOS.includes(meta.format)) throw new Error("formato");
    // Los GIF (y WebP) animados siguen moviéndose: se pasan a WebP animado
    const animada = (meta.pages ?? 1) > 1;
    let imagen = sharp(contenido, { limitInputPixels: 50_000_000, animated: animada });
    if (!animada) imagen = imagen.rotate(); // respeta la orientación de las fotos del móvil
    datos = await imagen
      .resize({
        width: LADO_IMAGEN_MENSAJE,
        height: LADO_IMAGEN_MENSAJE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    const final = await sharp(datos, { animated: animada }).metadata();
    ancho = final.width ?? 0;
    alto = final.pageHeight ?? final.height ?? 0;
  } catch {
    throw new ErrorMensaje("No hemos podido leer la imagen. Prueba con una JPG, PNG, WebP o GIF.");
  }
  const clave = `mensajes/${Date.now().toString(36)}-${randomBytes(12).toString("hex")}.webp`;
  await guardarPrivado(clave, datos, "image/webp");
  return { clave, ancho, alto };
}
