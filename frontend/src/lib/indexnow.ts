/**
 * INDEXNOW: avisa a Bing (y a Yandex, Seznam, Naver…) de las páginas de la web cada vez que se
 * publica una versión nueva, para que las visiten enseguida en lugar de esperar a que pasen solas.
 * Google no usa IndexNow: para Google está el sitemap y Search Console.
 *
 * La clave es pública a propósito: el archivo public/<CLAVE>.txt demuestra que la web es nuestra.
 * Solo se ejecuta en Render (variable RENDER) y con la dirección real de la web.
 */
export const CLAVE_INDEXNOW = "b0945ae70da0e135a512a8d74273dabf";

/** Las direcciones <loc> de un sitemap.xml */
export function direccionesDelSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/** La dirección pública de la web, solo si estamos en Render con un dominio real (si no, "") */
function webReal(): string {
  const web = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (!process.env.RENDER || !/^https:\/\//.test(web) || /localhost|127\.0\.0\.1/.test(web)) return "";
  return web;
}

function enviar(web: string, urlList: string[]) {
  return fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(web).host,
      key: CLAVE_INDEXNOW,
      keyLocation: `${web}/${CLAVE_INDEXNOW}.txt`,
      urlList,
    }),
    signal: AbortSignal.timeout(8000),
  });
}

/** Avisa al momento de unas páginas concretas (por ejemplo, un artículo recién publicado) */
export async function avisarPaginas(urlList: string[]) {
  const web = webReal();
  if (!web || urlList.length === 0) return;
  try {
    const respuesta = await enviar(web, urlList);
    console.log(`[indexnow] ${urlList.length} páginas enviadas → ${respuesta.status}`);
  } catch (error) {
    console.log(`[indexnow] no se pudo avisar: ${error instanceof Error ? error.message : error}`);
  }
}

export function avisarBuscadores() {
  const web = webReal();
  if (!web) return;
  // Se espera un poco: la web tiene que estar ya en marcha para leer su propio sitemap
  const espera = setTimeout(async () => {
    try {
      const sitemap = await fetch(`${web}/sitemap.xml`, { cache: "no-store" });
      const urlList = direccionesDelSitemap(await sitemap.text());
      if (urlList.length === 0) return;
      const respuesta = await enviar(web, urlList);
      console.log(`[indexnow] ${urlList.length} páginas enviadas → ${respuesta.status}`);
    } catch (error) {
      console.log(
        `[indexnow] no se pudo avisar: ${error instanceof Error ? error.message : error}`,
      );
    }
  }, 90_000);
  espera.unref?.();
}
