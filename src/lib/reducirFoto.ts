/**
 * Reduce en el navegador una foto demasiado pesada ANTES de enviarla al servidor.
 * En Vercel cada envío tiene un máximo fijo de 4,5 MB, y las fotos del móvil suelen pasar de ahí.
 * El servidor la vuelve a reducir y la convierte a WebP igualmente (src/lib/almacenamiento).
 */

/** Por encima de este peso, la foto se reduce antes de subirla (deja margen al resto del formulario) */
export const LIMITE_SIN_REDUCIR_MB = 3.5;
/** Lado más largo tras reducirla: de sobra para los 1600 px que guarda el servidor */
const LADO_MAXIMO = 2400;

function aBlob(lienzo: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
  return new Promise((resolver) => lienzo.toBlob(resolver, tipo, 0.9));
}

/** Devuelve la misma foto si ya es ligera, o una copia reducida (WebP, o JPG si el navegador no sabe hacer WebP) */
export async function reducirFoto(archivo: File): Promise<File> {
  if (archivo.size <= LIMITE_SIN_REDUCIR_MB * 1024 * 1024) return archivo;

  try {
    // imageOrientation: respeta el giro de las fotos hechas con el móvil
    const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close();

    // Safari no sabe crear WebP: entonces devuelve un PNG (pesado) y usamos JPG
    let blob = await aBlob(lienzo, "image/webp");
    if (blob?.type !== "image/webp") blob = await aBlob(lienzo, "image/jpeg");
    if (!blob) return archivo;

    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    const nombre = archivo.name.replace(/\.[^.]+$/, "") + "." + extension;
    return new File([blob], nombre, { type: blob.type });
  } catch {
    // Si el navegador no puede leerla, se envía tal cual y el servidor explica el problema
    return archivo;
  }
}
