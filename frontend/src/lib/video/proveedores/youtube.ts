import type { ProveedorVideo } from "../tipos";

const FORMATO_ID = /^[\w-]{11}$/;

/**
 * YouTube. Admite youtube.com/watch?v=…, youtu.be/…, /shorts/…, /embed/… y el identificador solo.
 * Se incrusta con youtube-nocookie.com, que no guarda cookies hasta que se reproduce.
 */
export const youtube: ProveedorVideo = {
  id: "youtube",
  nombre: "YouTube",
  ejemplo: "https://www.youtube.com/watch?v=dQw4w9WgXcQ  o  dQw4w9WgXcQ",
  idDesdeUrl(url) {
    const host = url.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1);
    if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
      id =
        url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] ??
        null;
    }
    return id && FORMATO_ID.test(id) ? id : null;
  },
  esIdentificador: (texto) => FORMATO_ID.test(texto),
  urlNormal: (id) => `https://www.youtube.com/watch?v=${id}`,
  // enablejsapi=1 permite usar la API oficial (YouTube IFrame API) para saber cuándo termina
  urlIncrustada: (id) =>
    `https://www.youtube-nocookie.com/embed/${id}?rel=0&enablejsapi=1&playsinline=1`,
};
