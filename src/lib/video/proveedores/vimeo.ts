import type { ProveedorVideo } from "../tipos";

const FORMATO_ID = /^\d{5,12}$/;

/** Vimeo. Admite vimeo.com/123456789, player.vimeo.com/video/123456789 y el número solo. */
export const vimeo: ProveedorVideo = {
  id: "vimeo",
  nombre: "Vimeo",
  ejemplo: "https://vimeo.com/76979871  o  76979871",
  idDesdeUrl(url) {
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
    return url.pathname.match(/(\d{5,12})/)?.[1] ?? null;
  },
  esIdentificador: (texto) => FORMATO_ID.test(texto),
  urlNormal: (id) => `https://vimeo.com/${id}`,
  urlIncrustada: (id) => `https://player.vimeo.com/video/${id}`,
};
