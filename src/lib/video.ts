/**
 * VÍDEOS DE LAS LECCIONES
 * En data/cursos.json cada lección tiene "videoUrl". Puede ser:
 *   "PENDIENTE"                          → todavía no hay vídeo (se enseña un aviso)
 *   https://www.youtube.com/watch?v=…    → YouTube (también youtu.be/… y /shorts/…)
 *   https://vimeo.com/123456             → Vimeo
 *   https://…/video.mp4 o /videos/x.mp4  → un archivo de vídeo
 */
export type FuenteVideo =
  | { tipo: "pendiente" }
  | { tipo: "incrustado"; src: string; proveedor: "YouTube" | "Vimeo" }
  | { tipo: "archivo"; src: string };

export function fuenteVideo(url: string): FuenteVideo {
  if (!url || url === "PENDIENTE") return { tipo: "pendiente" };

  try {
    const u = new URL(url, "http://local");
    const host = u.hostname.replace(/^www\./, "");

    // YouTube: usamos youtube-nocookie.com, que no guarda cookies hasta que se reproduce
    let idYoutube: string | null = null;
    if (host === "youtu.be") idYoutube = u.pathname.slice(1);
    if (host === "youtube.com" || host === "m.youtube.com") {
      idYoutube =
        u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1] ?? null;
    }
    if (idYoutube && /^[\w-]{6,}$/.test(idYoutube)) {
      return {
        tipo: "incrustado",
        proveedor: "YouTube",
        src: `https://www.youtube-nocookie.com/embed/${idYoutube}?rel=0`,
      };
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const idVimeo = u.pathname.match(/(\d{5,})/)?.[1];
      if (idVimeo) {
        return {
          tipo: "incrustado",
          proveedor: "Vimeo",
          src: `https://player.vimeo.com/video/${idVimeo}`,
        };
      }
    }
  } catch {
    // Si la dirección no es válida, la tratamos como archivo
  }

  return { tipo: "archivo", src: url };
}
