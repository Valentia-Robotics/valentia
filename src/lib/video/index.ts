/**
 * VÍDEOS DE LAS LECCIONES
 * En la base de datos, cada lección guarda "videoUrl". Puede ser:
 *   "PENDIENTE"                          → todavía no hay vídeo (se enseña un aviso)
 *   https://www.youtube.com/watch?v=…    → un servicio de vídeo (ver proveedores/)
 *   https://…/video.mp4 o /videos/x.mp4  → un archivo de vídeo
 */
import { proveedoresVideo } from "./proveedores";

export { proveedoresVideo };
export type { ProveedorVideo } from "./tipos";

/** Valor que significa "todavía no hay vídeo" */
export const SIN_VIDEO = "PENDIENTE";

export type FuenteVideo =
  | { tipo: "pendiente" }
  | {
      tipo: "incrustado";
      src: string;
      /** Nombre que se ve: "YouTube" */
      proveedor: string;
      /** Identificador del servicio ("youtube", "vimeo") y del vídeo, para usar su API */
      servicio: string;
      idVideo: string;
    }
  | { tipo: "archivo"; src: string };

/** Lee una dirección como URL (las rutas como /videos/x.mp4 también valen). null si no es válida. */
function comoUrl(texto: string): URL | null {
  try {
    return new URL(texto, "http://local");
  } catch {
    return null;
  }
}

/** Averigua de qué servicio es un vídeo guardado y su identificador (para rellenar el formulario del panel) */
export function analizarVideo(url: string): { proveedor: string; valor: string } {
  if (!url || url === SIN_VIDEO) return { proveedor: "", valor: "" };
  const u = comoUrl(url);
  for (const p of proveedoresVideo) {
    const id = u && p.idDesdeUrl(u);
    if (id) return { proveedor: p.id, valor: p.urlNormal(id) };
  }
  return { proveedor: "archivo", valor: url };
}

/** Lo que necesita el reproductor de la lección para enseñar el vídeo */
export function fuenteVideo(url: string): FuenteVideo {
  if (!url || url === SIN_VIDEO) return { tipo: "pendiente" };
  const u = comoUrl(url);
  for (const p of proveedoresVideo) {
    const id = u && p.idDesdeUrl(u);
    if (id) {
      return {
        tipo: "incrustado",
        proveedor: p.nombre,
        servicio: p.id,
        idVideo: id,
        src: p.urlIncrustada(id),
      };
    }
  }
  return { tipo: "archivo", src: url };
}

/**
 * Convierte lo que se escribe en el panel (una dirección o solo el identificador)
 * en la dirección que se guarda. Devuelve un error en español si no se entiende.
 *   proveedor: "" (sin vídeo), "archivo" o el id de un servicio ("youtube", "vimeo"…)
 */
export function normalizarVideo(
  proveedor: string,
  texto: string,
): { ok: true; url: string } | { ok: false; error: string } {
  const valor = texto.trim();
  if (!proveedor) return { ok: true, url: SIN_VIDEO };
  if (!valor) return { ok: false, error: "Pega la dirección del vídeo o su identificador." };

  if (proveedor === "archivo") {
    const esRuta = valor.startsWith("/") && !valor.startsWith("//");
    const esWeb = /^https:\/\//.test(valor);
    if ((esRuta || esWeb) && /\.(mp4|webm)(\?.*)?$/i.test(valor) && comoUrl(valor)) {
      return { ok: true, url: valor };
    }
    return {
      ok: false,
      error: "Tiene que ser una dirección https://… o /… que acabe en .mp4 o .webm.",
    };
  }

  const servicio = proveedoresVideo.find((p) => p.id === proveedor);
  if (!servicio) return { ok: false, error: "Elige un servicio de vídeo de la lista." };

  // Una dirección completa (https://…) o solo el identificador del vídeo
  const url = /^https?:\/\//i.test(valor) ? comoUrl(valor) : null;
  const id = url ? servicio.idDesdeUrl(url) : servicio.esIdentificador(valor) ? valor : null;
  if (!id) {
    return {
      ok: false,
      error: `No reconocemos ese vídeo de ${servicio.nombre}. Ejemplo: ${servicio.ejemplo}`,
    };
  }
  return { ok: true, url: servicio.urlNormal(id) };
}
