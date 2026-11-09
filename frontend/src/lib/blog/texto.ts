/**
 * BLOG: Markdown → HTML limpio, y las cuentas que hacen falta (palabras, subtítulos, slug, metas).
 * Sin base de datos: se usa en el servidor, en la API y en las pruebas.
 */
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import {
  HOSTS_IMAGENES,
  LARGO_META,
  PALABRAS_POR_MINUTO,
  SLUGS_RESERVADOS,
} from "@/config/blog";

/** ¿Imagen de un banco con licencia libre (o de la propia web)? */
export function imagenPermitida(url: string): boolean {
  if (url.startsWith("/images/")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && HOSTS_IMAGENES.includes(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Markdown → HTML que se puede pintar sin riesgo. Solo etiquetas de texto (nada de scripts, estilos,
 * iframes ni atributos de eventos). El título de la página es el único H1: los # del texto pasan a H2.
 * Las imágenes de otros sitios se quitan; los enlaces externos llevan nofollow y se abren aparte.
 */
export function markdownAHtml(markdown: string): string {
  const crudo = marked.parse(markdown, { async: false, gfm: true });
  return sanitizeHtml(crudo, {
    allowedTags: [
      "h2", "h3", "h4", "p", "br", "hr", "strong", "em", "blockquote", "ul", "ol", "li",
      "a", "code", "pre", "img", "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "rel", "target"],
      img: ["src", "alt", "title", "loading"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      h1: "h2",
      a: (etiqueta, atributos) => {
        const externo = /^https?:\/\//.test(atributos.href ?? "");
        return {
          tagName: etiqueta,
          attribs: externo
            ? { ...atributos, rel: "noopener noreferrer nofollow", target: "_blank" }
            : atributos,
        };
      },
      img: (etiqueta, atributos) => ({
        tagName: etiqueta,
        attribs: { ...atributos, loading: "lazy", alt: atributos.alt ?? "" },
      }),
    },
    exclusiveFilter: (marco) => marco.tag === "img" && !imagenPermitida(marco.attribs.src ?? ""),
  });
}

/** Texto plano de un HTML (para contar palabras o sacar el extracto) */
export function textoPlano(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function contarPalabras(html: string): number {
  const texto = textoPlano(html);
  return texto ? texto.split(" ").length : 0;
}

export function contarSubtitulos(html: string): number {
  return (html.match(/<h2[\s>]/g) ?? []).length;
}

export function minutosLectura(palabras: number): number {
  return Math.max(1, Math.round(palabras / PALABRAS_POR_MINUTO));
}

/** Corta en el último espacio antes del máximo, para no partir palabras */
export function recortar(texto: string, maximo: number): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= maximo) return limpio;
  const corte = limpio.slice(0, maximo - 1);
  const espacio = corte.lastIndexOf(" ");
  return `${(espacio > 0 ? corte.slice(0, espacio) : corte).replace(/[\s,;:.-]+$/, "")}…`;
}

/** El primer párrafo del texto, como extracto */
export function extractoDe(html: string): string {
  const parrafo = html.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? html;
  return recortar(textoPlano(parrafo), LARGO_META.extracto);
}

/** «¿Qué es un ESP32? Guía 2026» → «que-es-un-esp32-guia-2026» */
export function crearSlug(texto: string): string {
  const slug = texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  if (!slug) return "articulo";
  return SLUGS_RESERVADOS.includes(slug) ? `${slug}-articulo` : slug;
}

/** Palabras con significado de un texto, sin tildes ni palabras vacías («el», «de», «para»…) */
function palabrasClave(texto: string): Set<string> {
  return new Set(
    texto
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length > 3),
  );
}

/** De 0 (nada en común) a 1 (las mismas palabras importantes) */
export function similitud(a: string, b: string): number {
  const pa = palabrasClave(a);
  const pb = palabrasClave(b);
  if (pa.size === 0 || pb.size === 0) return 0;
  const comunes = [...pa].filter((p) => pb.has(p)).length;
  return comunes / Math.min(pa.size, pb.size);
}

/** Igual a efectos de comparar: sin tildes, mayúsculas ni espacios de más */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** El slug de un kit a partir de lo que mande n8n: slug, «/kits/slug» o la dirección completa */
export function slugDeKit(valor: string): string {
  const limpio = valor.trim().replace(/\/+$/, "");
  return limpio.split("/").pop() ?? "";
}
