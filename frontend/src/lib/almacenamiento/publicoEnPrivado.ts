/**
 * FOTOS DEL PANEL GUARDADAS EN EL ALMACÉN PRIVADO
 * Las fotos de kits y componentes que se suben desde el panel iban al disco del servidor (carpeta
 * subidas/). En Render ese disco se vacía en cada publicación, así que las fotos desaparecían.
 *
 * Si la web no tiene un bucket PÚBLICO para fotos (ALMACEN_PROVEEDOR="nube") ni un disco que no se
 * borra (ALMACEN_LOCAL_CARPETA), las fotos van al almacén privado (el bucket de R2 que ya usan el
 * chat, las fotos de perfil y los archivos de hardware), en la carpeta "publicas/". La dirección
 * NO cambia: sigue siendo /subidas/<carpeta>/<nombre>.webp, y la ruta /subidas/… la busca primero
 * en el disco (fotos antiguas o de desarrollo) y luego en el almacén.
 *
 * Solo se sirven nombres creados por nombreAlAzar() y siempre dentro de "publicas/": nadie puede
 * pedir por esta dirección un archivo del chat o de hardware.
 */
import "server-only";
import { borrarPrivado, ErrorAlmacenPrivado, guardarPrivado, leerPrivado } from "./privado";
import type { Almacen } from "./tipos";

/** Dirección pública (la misma que el almacén local) */
const PREFIJO_URL = "/subidas/";
/** Carpeta dentro del almacén privado */
const CARPETA = "publicas";

/**
 * ¿Hay que usar este almacén? Sí cuando no hay otro sitio que dure:
 * ni bucket público, ni disco propio configurado, y hay bucket privado o estamos en Render.
 */
export function usarAlmacenPrivadoParaFotos(): boolean {
  if (process.env.ALMACEN_PROVEEDOR === "nube") return false;
  if (process.env.ALMACEN_LOCAL_CARPETA?.trim()) return false;
  return Boolean(process.env.ALMACEN_PRIVADO_BUCKET?.trim()) || Boolean(process.env.RENDER);
}

/**
 * Clave en el almacén privado de una foto pública ("kits/abc-0123456789ab.webp"), o null si la ruta
 * no es una de las que crea el panel.
 */
export function claveFotoPublica(ruta: string): string | null {
  return /^[a-z0-9-]+\/[a-z0-9]+-[a-f0-9]{12}\.webp$/.test(ruta) ? `${CARPETA}/${ruta}` : null;
}

export const almacenPublicoEnPrivado: Almacen = {
  async guardar(ruta, datos, tipoContenido) {
    const clave = claveFotoPublica(ruta);
    if (!clave) throw new Error("Ruta de foto no válida");
    await guardarPrivado(clave, datos, tipoContenido);
    return PREFIJO_URL + ruta;
  },

  async borrar(url) {
    if (!url.startsWith(PREFIJO_URL)) return; // no es una subida (por ejemplo, /images/…)
    const clave = claveFotoPublica(url.slice(PREFIJO_URL.length));
    if (!clave) return;
    await borrarPrivado(clave).catch((error) => {
      console.error(`No se ha podido borrar ${url} del almacén:`, error);
    });
  },
};

/** Lee una foto pública del almacén privado (la usa /subidas/…). null si no está. */
export async function leerFotoPublica(ruta: string): Promise<ReadableStream<Uint8Array> | null> {
  const clave = claveFotoPublica(ruta);
  if (!clave) return null;
  return leerPrivado(clave).catch((error) => {
    if (!(error instanceof ErrorAlmacenPrivado)) throw error;
    return null;
  });
}
