/**
 * GIFs EN LOS CHATS DEL EQUIPO (reglas puras, sin base de datos: las usan el servidor y su test)
 *
 * Los GIFs salen de GIPHY (https://developers.giphy.com): su clave gratis va en la variable
 * GIPHY_API_KEY de Render. La búsqueda la hace SIEMPRE el servidor (/api/mensajes/gifs), así la
 * clave nunca llega al navegador. Al enviar uno, el servidor lo descarga de GIPHY y lo guarda como
 * una imagen más del chat (almacén privado): se ve aunque GIPHY lo borre y sigue los mismos tics,
 * avisos y permisos que cualquier imagen.
 */

/** Cuántos GIFs se piden cada vez (GIPHY da hasta 50) */
export const GIFS_POR_PAGINA = 24;
/** Búsqueda más larga que se acepta */
export const MAX_CARACTERES_BUSQUEDA_GIF = 50;
/** Solo GIFs aptos para todo el mundo y algo más (GIPHY: g, pg, pg-13, r) */
export const CLASIFICACION_GIF = "pg-13";

/** Qué se busca en GIPHY: GIFs normales o stickers (fondo transparente) */
export type TipoGif = "gifs" | "stickers";
export const leerTipoGif = (valor: unknown): TipoGif =>
  valor === "stickers" ? "stickers" : "gifs";

/** Un GIF tal como lo ve el selector del chat */
export interface GifEncontrado {
  id: string;
  titulo: string;
  /** El GIF pequeño para la lista (200 px de ancho) */
  vistaPrevia: string;
  ancho: number;
  alto: number;
}

/** Los ids de GIPHY son letras y números (p. ej. «3o7TKSjRrfIPjeiVyM») */
export const esIdGif = (id: unknown): id is string =>
  typeof id === "string" && /^[A-Za-z0-9]{3,40}$/.test(id);

/** Limpia lo que escribe la persona en el buscador */
export const limpiarBusquedaGif = (texto: string) =>
  texto.replace(/\s+/g, " ").trim().slice(0, MAX_CARACTERES_BUSQUEDA_GIF);

/**
 * ¿Se puede descargar de esa dirección? Solo https y solo de GIPHY (sus servidores son
 * media*.giphy.com e i.giphy.com). «extra» = otro origen permitido (pruebas con un GIPHY falso).
 */
export function esDireccionDeGiphy(direccion: unknown, extra?: string): direccion is string {
  if (typeof direccion !== "string") return false;
  try {
    const url = new URL(direccion);
    if (extra && url.origin === new URL(extra).origin) return true;
    return (
      url.protocol === "https:" &&
      (url.hostname === "giphy.com" || url.hostname.endsWith(".giphy.com"))
    );
  } catch {
    return false;
  }
}

/* ---- Lo que responde GIPHY (solo lo que se usa; todo puede faltar) ---- */
interface ImagenGiphy {
  url?: string;
  webp?: string;
  width?: string;
  height?: string;
  size?: string;
}
interface GifGiphy {
  id?: string;
  title?: string;
  images?: Record<string, ImagenGiphy | undefined>;
}

const numero = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/** Pasa la respuesta de una búsqueda de GIPHY a la lista del selector (salta lo que no valga) */
export function leerListaGiphy(cuerpo: unknown, extra?: string): GifEncontrado[] {
  const datos = (cuerpo as { data?: unknown })?.data;
  if (!Array.isArray(datos)) return [];
  const lista: GifEncontrado[] = [];
  for (const g of datos as GifGiphy[]) {
    const img = g?.images?.fixed_width ?? g?.images?.fixed_width_downsampled;
    const vistaPrevia = img?.webp || img?.url;
    if (!esIdGif(g?.id) || !esDireccionDeGiphy(vistaPrevia, extra)) continue;
    lista.push({
      id: g.id,
      titulo: typeof g.title === "string" ? g.title.slice(0, 120) : "",
      vistaPrevia,
      ancho: numero(img?.width) || 200,
      alto: numero(img?.height) || 200,
    });
  }
  return lista;
}

/**
 * De un GIF de GIPHY, la versión que se guarda en el chat: la mediana (hasta 5 MB) si está y
 * cabe, si no la reducida (hasta 2 MB) y, como último remedio, la original. null = ninguna vale.
 */
export function direccionParaGuardar(
  cuerpo: unknown,
  maxBytes: number,
  extra?: string,
): string | null {
  const imagenes = (cuerpo as { data?: GifGiphy })?.data?.images;
  if (!imagenes) return null;
  for (const nombre of ["downsized_medium", "downsized", "original"]) {
    const img = imagenes[nombre];
    const tamano = numero(img?.size);
    if (img && esDireccionDeGiphy(img.url, extra) && (!tamano || tamano <= maxBytes))
      return img.url;
  }
  return null;
}
