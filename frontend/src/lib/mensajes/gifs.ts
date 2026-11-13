/**
 * GIFs DE GIPHY PARA LOS CHATS DEL EQUIPO (solo en el servidor: la clave nunca sale de aquí)
 * - buscarGifs: lo que pide el selector del chat (búsqueda o, sin texto, los del momento).
 * - descargarGif: al enviar uno, sus bytes, que se guardan como cualquier imagen del chat.
 * Reglas y lectura de las respuestas en src/config/gifs.ts.
 */
import "server-only";
import {
  CLASIFICACION_GIF,
  GIFS_POR_PAGINA,
  direccionParaGuardar,
  esDireccionDeGiphy,
  esIdGif,
  leerListaGiphy,
  type GifEncontrado,
  type TipoGif,
} from "@/config/gifs";
import { MAX_BYTES_IMAGEN, MAX_MB_IMAGEN } from "@/config/mensajes";
import { ErrorMensaje } from "./mensajes";

/** GIPHY_API_URL solo se cambia en pruebas (un GIPHY falso); en la web real, el de siempre */
const PRUEBAS = process.env.GIPHY_API_URL || undefined;
const BASE = (PRUEBAS ?? "https://api.giphy.com/v1").replace(/\/$/, "");

/** ¿Están activados los GIFs? (hace falta la clave de GIPHY en Render) */
export const hayGifs = () => !!process.env.GIPHY_API_KEY;

// Lo buscado hace poco se guarda unos minutos: el equipo repite mucho y GIPHY gratis da pocas llamadas
const MINUTOS_CACHE = 10;
const cache = new Map<string, { hasta: number; gifs: GifEncontrado[] }>();

async function pedirAGiphy(ruta: string, parametros: Record<string, string>) {
  const url = new URL(`${BASE}/${ruta}`);
  url.search = new URLSearchParams({
    api_key: process.env.GIPHY_API_KEY ?? "",
    ...parametros,
  }).toString();
  let respuesta: Response;
  try {
    respuesta = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  } catch {
    throw new ErrorMensaje("GIPHY no contesta ahora mismo. Vuelve a probar en un momento.");
  }
  if (respuesta.status === 429)
    throw new ErrorMensaje("Se han buscado muchos GIFs esta hora. Prueba un poco más tarde.");
  if (!respuesta.ok) {
    // 401/403: la clave está mal. Sale en los logs de Render (sin la clave)
    console.error(`[gifs] GIPHY ha respondido ${respuesta.status} a «${ruta}».`);
    throw new ErrorMensaje("No se han podido cargar los GIFs. Vuelve a probar en un momento.");
  }
  return respuesta.json().catch(() => null);
}

/**
 * Busca GIFs o stickers (sin texto: los del momento). «desde» = cuántos se han visto ya (para «Ver
 * más»). Los stickers son GIFs con el fondo transparente (en el chat se ven sin burbuja).
 */
export async function buscarGifs(
  busqueda: string,
  desde = 0,
  tipo: TipoGif = "gifs",
): Promise<GifEncontrado[]> {
  const clave = `${tipo}|${busqueda.toLowerCase()}|${desde}`;
  const guardado = cache.get(clave);
  if (guardado && guardado.hasta > Date.now()) return guardado.gifs;

  const comunes = {
    limit: String(GIFS_POR_PAGINA),
    offset: String(Math.max(0, Math.min(desde, 4999))),
    rating: CLASIFICACION_GIF,
    bundle: "messaging_non_clips",
  };
  const cuerpo = busqueda
    ? await pedirAGiphy(`${tipo}/search`, { ...comunes, q: busqueda, lang: "es" })
    : await pedirAGiphy(`${tipo}/trending`, comunes);
  const gifs = leerListaGiphy(cuerpo, PRUEBAS);

  if (cache.size > 300) cache.clear(); // no crece sin parar
  cache.set(clave, { hasta: Date.now() + MINUTOS_CACHE * 60_000, gifs });
  return gifs;
}

/** Los bytes del GIF (o sticker: GIPHY los da por el mismo camino) elegido, para guardarlo en el chat. Lanza ErrorMensaje si no se puede */
export async function descargarGif(id: string): Promise<Buffer> {
  if (!hayGifs()) throw new ErrorMensaje("Los GIFs aún no están activados.");
  if (!esIdGif(id)) throw new ErrorMensaje("Ese GIF no existe.");
  const cuerpo = await pedirAGiphy(`gifs/${id}`, { rating: CLASIFICACION_GIF });
  const direccion = direccionParaGuardar(cuerpo, MAX_BYTES_IMAGEN, PRUEBAS);
  if (!direccion) throw new ErrorMensaje("Ese GIF ya no está en GIPHY. Elige otro.");

  let respuesta: Response;
  try {
    // redirect "error": si GIPHY mandara a otro sitio, no se sigue
    respuesta = await fetch(direccion, {
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
      cache: "no-store",
    });
  } catch {
    throw new ErrorMensaje("No se ha podido descargar el GIF. Vuelve a probar.");
  }
  if (!respuesta.ok || !respuesta.body || !esDireccionDeGiphy(respuesta.url || direccion, PRUEBAS))
    throw new ErrorMensaje("No se ha podido descargar el GIF. Vuelve a probar.");

  // Se lee por trozos y se corta si pasa del máximo (no se fía del tamaño que diga GIPHY)
  const trozos: Uint8Array[] = [];
  let total = 0;
  const lector = respuesta.body.getReader();
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES_IMAGEN) {
      await lector.cancel();
      throw new ErrorMensaje(`Ese GIF pesa más de ${MAX_MB_IMAGEN} MB. Elige otro.`);
    }
    trozos.push(value);
  }
  return Buffer.concat(trozos);
}
