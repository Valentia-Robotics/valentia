/**
 * Recorrer la web en las pruebas E2E: vigila la consola, los errores y las respuestas fallidas,
 * busca imágenes rotas y sigue los enlaces de cada página (lo usa todas-las-paginas.spec.ts).
 */
import type { Page } from "@playwright/test";

/** Problemas encontrados (se comprueban al final de cada prueba) */
export type Problemas = string[];

/** Rutas que no se abren como página (descargas, salir, API…) */
const NO_ABRIR = [
  /^\/api\//,
  /\/laser$/,
  /^\/subidas\//,
  /\.(png|svg|webp|jpg|ico|webmanifest|xml|txt|zip)$/,
];

/** Vigila la consola, los errores de JavaScript y las respuestas fallidas de la propia web */
export function vigilar(pagina: Page, problemas: Problemas) {
  pagina.on("console", (mensaje) => {
    if (mensaje.type() !== "error") return;
    const texto = mensaje.text();
    // Vídeos de terceros bloqueados sin consentimiento de cookies: es lo esperado
    if (/youtube|vimeo/i.test(texto)) return;
    problemas.push(`consola en ${pagina.url()}: ${texto.slice(0, 200)}`);
  });
  pagina.on("pageerror", (error) =>
    problemas.push(`JavaScript en ${pagina.url()}: ${error.message}`),
  );
  pagina.on("response", (respuesta) => {
    const url = new URL(respuesta.url());
    if (url.host !== "localhost:3100") return; // solo la propia web (playwright.config.ts)
    if (respuesta.status() >= 400 && !url.pathname.startsWith("/api/auth/")) {
      problemas.push(
        `HTTP ${respuesta.status()} en ${url.pathname}${url.search} (desde ${pagina.url()})`,
      );
    }
  });
}

/** Imágenes de la página que no han cargado */
export async function imagenesRotas(pagina: Page): Promise<string[]> {
  return pagina.evaluate(async () => {
    const imagenes = [...document.images].filter((img) => img.currentSrc || img.src);
    // Las de carga diferida (loading="lazy") no se piden hasta que se ven: se fuerzan
    for (const img of imagenes) img.loading = "eager";
    await Promise.all(
      imagenes.map((img) =>
        img.complete
          ? null
          : new Promise((listo) => {
              img.addEventListener("load", listo, { once: true });
              img.addEventListener("error", listo, { once: true });
              setTimeout(listo, 8000);
            }),
      ),
    );
    return imagenes
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src);
  });
}

/**
 * Abre las páginas de "inicio" y las que enlazan (de la misma web, que cumplan "dentro"), hasta "maximo".
 * Devuelve las rutas visitadas.
 */
export async function recorrer(
  pagina: Page,
  inicio: string[],
  dentro: (ruta: string) => boolean,
  problemas: Problemas,
  maximo = 80,
): Promise<string[]> {
  const pendientes = [...inicio];
  const vistas = new Set<string>();
  while (pendientes.length > 0 && vistas.size < maximo) {
    const ruta = pendientes.shift()!;
    if (vistas.has(ruta)) continue;
    vistas.add(ruta);
    const respuesta = await pagina.goto(ruta);
    const estado = respuesta?.status() ?? 0;
    if (estado >= 400) continue; // ya lo anota vigilar()
    await pagina.waitForLoadState("load"); // ("networkidle" esperaría a las precargas de Next)
    for (const src of await imagenesRotas(pagina)) problemas.push(`imagen rota en ${ruta}: ${src}`);
    const enlaces = await pagina.$$eval("a[href]", (as) =>
      as.map((a) => a.getAttribute("href") ?? ""),
    );
    for (const href of enlaces) {
      const url = new URL(href, pagina.url());
      if (url.origin !== new URL(pagina.url()).origin) continue;
      const destino = url.pathname + url.search;
      if (vistas.has(destino) || pendientes.includes(destino)) continue;
      if (NO_ABRIR.some((patron) => patron.test(url.pathname))) {
        // Se comprueba que responde, sin abrirla como página
        const r = await pagina.request.get(destino, { maxRedirects: 0 }).catch(() => null);
        if (!r || r.status() >= 400)
          problemas.push(`enlace roto en ${ruta}: ${destino} (${r?.status()})`);
        vistas.add(destino);
      } else if (dentro(url.pathname)) {
        pendientes.push(destino);
      }
    }
  }
  console.log(`  ${vistas.size} rutas revisadas desde ${inicio[0]}`);
  return [...vistas];
}

/** La misma base de datos que usa la web de pruebas (playwright.config.ts) */
export function urlBDPruebas(): string {
  return (process.env.DATABASE_URL ?? "").replace(
    /^(mongodb(?:\+srv)?:\/\/[^/]+)(?:\/([^?]*))?/,
    (_, base: string, bd?: string) => `${base}/${(bd || "valentia").replace(/_e2e$/, "")}_e2e`,
  );
}
