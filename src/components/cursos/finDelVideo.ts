/**
 * ¿CUÁNDO TERMINA EL VÍDEO?
 * Usa las API oficiales de cada reproductor (solo en el navegador):
 *   - YouTube: YouTube IFrame API (https://www.youtube.com/iframe_api)
 *   - Vimeo:   Vimeo Player SDK   (https://player.vimeo.com/api/player.js)
 *   - Archivo .mp4/.webm: el evento "ended" del <video> (no hace falta nada de aquí)
 *
 * Para otro servicio de vídeo: añade aquí su detector con el mismo id que en
 * src/lib/video/proveedores. Si no tiene detector, la lección enseña el botón
 * «He terminado el vídeo» para desbloquear el test.
 */

/* Lo poco que usamos de cada API (no hace falta instalar sus tipos) */
interface ApiYouTube {
  Player: new (
    iframe: HTMLIFrameElement,
    opciones: { events: { onStateChange(evento: { data: number }): void } },
  ) => unknown;
  PlayerState: { ENDED: number };
}
interface ReproductorVimeo {
  on(evento: "ended", accion: () => void): void;
  off(evento: "ended"): void;
}
interface ApiVimeo {
  Player: new (iframe: HTMLIFrameElement) => ReproductorVimeo;
}

declare global {
  interface Window {
    YT?: ApiYouTube;
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: ApiVimeo;
  }
}

const scripts = new Map<string, Promise<void>>();

/** Carga un script externo una sola vez */
function cargarScript(src: string): Promise<void> {
  let promesa = scripts.get(src);
  if (!promesa) {
    promesa = new Promise<void>((resolver, rechazar) => {
      const etiqueta = document.createElement("script");
      etiqueta.src = src;
      etiqueta.async = true;
      etiqueta.onload = () => resolver();
      etiqueta.onerror = () => {
        scripts.delete(src); // para poder reintentarlo más tarde
        rechazar(new Error(`No se ha podido cargar ${src}`));
      };
      document.head.append(etiqueta);
    });
    scripts.set(src, promesa);
  }
  return promesa;
}

/** La API de YouTube avisa con onYouTubeIframeAPIReady cuando está lista */
function apiYouTube(): Promise<ApiYouTube> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolver, rechazar) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      if (window.YT) resolver(window.YT);
    };
    cargarScript("https://www.youtube.com/iframe_api").catch(rechazar);
  });
}

async function apiVimeo(): Promise<ApiVimeo> {
  if (!window.Vimeo?.Player) await cargarScript("https://player.vimeo.com/api/player.js");
  if (!window.Vimeo?.Player) throw new Error("La API de Vimeo no está disponible");
  return window.Vimeo;
}

type Detector = (iframe: HTMLIFrameElement, alTerminar: () => void) => Promise<() => void>;

const detectores: Record<string, Detector> = {
  async youtube(iframe, alTerminar) {
    const YT = await apiYouTube();
    let escuchando = true;
    new YT.Player(iframe, {
      events: {
        onStateChange: (evento) => {
          if (escuchando && evento.data === YT.PlayerState.ENDED) alTerminar();
        },
      },
    });
    // No llamamos a destroy(): borraría el <iframe>, que es de React
    return () => {
      escuchando = false;
    };
  },
  async vimeo(iframe, alTerminar) {
    const Vimeo = await apiVimeo();
    const reproductor = new Vimeo.Player(iframe);
    reproductor.on("ended", alTerminar);
    return () => reproductor.off("ended");
  },
};

/** true si sabemos detectar el final de los vídeos de este servicio */
export function hayDetector(servicio: string): boolean {
  return servicio in detectores;
}

/**
 * Empieza a escuchar el final del vídeo de un <iframe>.
 * Devuelve la función para dejar de escuchar. Si la API no carga (por ejemplo,
 * la bloquea una extensión), lanza un error y la lección ofrece el botón alternativo.
 */
export function escucharFinDelVideo(
  servicio: string,
  iframe: HTMLIFrameElement,
  alTerminar: () => void,
): Promise<() => void> {
  const detector = detectores[servicio];
  if (!detector) return Promise.reject(new Error(`Sin detector para ${servicio}`));
  return detector(iframe, alTerminar);
}
