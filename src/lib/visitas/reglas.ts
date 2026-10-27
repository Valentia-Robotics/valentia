/**
 * ESTADÍSTICAS DE VISITAS: reglas puras (sin base de datos), probadas en reglas.test.ts.
 *
 * Las visitas se cuentan SIN cookies y sin guardar la IP: solo la página, de dónde viene la
 * persona (Google, Instagram…), si es móvil u ordenador y una huella que cambia cada día
 * para saber cuántas personas distintas han entrado.
 */

/** Rutas que no se cuentan (el panel, pruebas internas y la API) */
const NO_CONTAR = [/^\/admin(\/|$)/, /^\/dev(\/|$)/, /^\/api(\/|$)/, /^\/diseno(\/|$)/];

/**
 * Deja la ruta lista para guardar: sin parámetros, sin barra final y sin datos privados
 * (el número de un pedido o una lección concreta se agrupan).
 * Devuelve null si la ruta no se cuenta.
 */
export function normalizarRuta(ruta: unknown): string | null {
  if (typeof ruta !== "string" || !ruta.startsWith("/") || ruta.length > 300) return null;
  let limpia = ruta.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (NO_CONTAR.some((patron) => patron.test(limpia))) return null;
  // Páginas con datos de una persona: se guardan agrupadas
  limpia = limpia
    .replace(/^\/pedido\/.+$/, "/pedido")
    .replace(/^\/cursos\/([^/]+)\/.+$/, "/cursos/$1");
  return limpia.slice(0, 120);
}

/** Webs conocidas, con un nombre fácil de leer */
const ORIGENES: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)yahoo\./, "Yahoo"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)ecosia\.org$/, "Ecosia"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "Facebook"],
  [/(^|\.)(tiktok\.com)$/, "TikTok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "X (Twitter)"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "WhatsApp"],
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)pinterest\./, "Pinterest"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "ChatGPT"],
];

/** Pone nombre a una web de origen: "www.google.es" → "Google"; "blog.ejemplo.com" → "blog.ejemplo.com" */
function nombreDeWeb(host: string): string {
  const limpio = host.toLowerCase().replace(/^www\./, "");
  return ORIGENES.find(([patron]) => patron.test(limpio))?.[1] ?? limpio;
}

/**
 * De dónde viene la persona al ENTRAR en la web.
 *  - Si el enlace lleva ?utm_source=instagram (enlaces que ponéis vosotros), manda eso.
 *  - Si no, la web anterior (referrer), si es otra web.
 *  - Si no hay nada: null (escribió la dirección, la tenía guardada o abrió un enlace desde una app).
 */
export function calcularOrigen(
  referente: unknown,
  utm: unknown,
  dominioPropio: string,
): string | null {
  if (typeof utm === "string" && utm.trim()) {
    const fuente = utm.trim().toLowerCase().slice(0, 40);
    if (fuente.includes(".")) return nombreDeWeb(fuente);
    // "instagram" → "Instagram"; un nombre propio ("folleto") se deja tal cual, con mayúscula
    const conocida = nombreDeWeb(`${fuente}.com`);
    return conocida === `${fuente}.com` ? fuente[0].toUpperCase() + fuente.slice(1) : conocida;
  }
  if (typeof referente !== "string" || !referente) return null;
  try {
    const host = new URL(referente).hostname;
    if (!host || host === dominioPropio || host === `www.${dominioPropio}`) return null;
    // android-app://com.google.android.gm → la app de Gmail, etc.
    return nombreDeWeb(host).slice(0, 60);
  } catch {
    return null;
  }
}

/** Robots, buscadores y herramientas automáticas: no son personas, no se cuentan */
const ROBOTS =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|facebookexternalhit|curl|wget|python|axios|node-fetch|go-http/i;

export function esRobot(navegador: string | null): boolean {
  return !navegador || ROBOTS.test(navegador);
}

export type Dispositivo = "movil" | "tableta" | "ordenador";

export function tipoDispositivo(navegador: string): Dispositivo {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(navegador)) return "tableta";
  if (/mobi|iphone|ipod|android/i.test(navegador)) return "movil";
  return "ordenador";
}

const formatoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** El día en España, como texto "2026-10-27" (así se agrupan las visitas por día) */
export function diaEnEspana(fecha = new Date()): string {
  return formatoDia.format(fecha);
}

/** Los últimos `dias` días en España, del más antiguo al de hoy: ["2026-10-21", …, "2026-10-27"] */
export function ultimosDias(dias: number, hoy = new Date()): string[] {
  // Se cuenta sobre el calendario (en UTC), así el cambio de hora no salta ni repite un día
  const base = new Date(`${diaEnEspana(hoy)}T00:00:00Z`).getTime();
  return Array.from({ length: dias }, (_, i) =>
    new Date(base - (dias - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}
