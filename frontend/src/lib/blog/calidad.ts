/**
 * FILTROS DE CALIDAD DEL BLOG (sin base de datos: se le pasa todo lo que necesita).
 * Devuelve los motivos por los que un artículo no debe publicarse solo. Lista vacía = pasa.
 */
import { CALIDAD_BLOG, categoriaPorSlug } from "@/config/blog";
import { imagenPermitida, normalizar, similitud } from "./texto";

export interface DatosParaRevisar {
  titulo: string;
  palabraClave: string;
  palabras: number;
  subtitulos: number;
  categoria: string;
  kitsPedidos: string[];
  kitsQueExisten: string[];
  imagenUrl?: string | null;
  imagenAlt?: string | null;
  /** Artículos de los últimos días (sin los rechazados ni el propio) */
  recientes: { titulo: string; palabraClave: string }[];
}

export function revisarCalidad(a: DatosParaRevisar): string[] {
  const motivos: string[] = [];
  const { minimoPalabras, minimoSubtitulos, diasDuplicado, similitudTitulo } = CALIDAD_BLOG;

  if (a.palabras < minimoPalabras) {
    motivos.push(`Tiene ${a.palabras} palabras; hacen falta al menos ${minimoPalabras}.`);
  }
  if (a.subtitulos < minimoSubtitulos) {
    motivos.push(
      `Tiene ${a.subtitulos} subtítulos (##); hacen falta al menos ${minimoSubtitulos}.`,
    );
  }
  if (!categoriaPorSlug(a.categoria)) motivos.push("La categoría no es ninguna de la lista.");

  const noExisten = a.kitsPedidos.filter((k) => !a.kitsQueExisten.includes(k));
  if (noExisten.length > 0) motivos.push(`Estos kits no existen: ${noExisten.join(", ")}.`);

  if (a.imagenUrl) {
    if (!imagenPermitida(a.imagenUrl)) {
      motivos.push(
        "La imagen no es de un banco con licencia libre (Unsplash, Pexels o Pixabay): no se puede usar.",
      );
    } else if (!a.imagenAlt?.trim()) {
      motivos.push("La imagen no tiene texto alternativo (image_alt).");
    }
  }

  const clave = normalizar(a.palabraClave);
  const repetido = a.recientes.find(
    (r) =>
      (clave && normalizar(r.palabraClave) === clave) ||
      similitud(r.titulo, a.titulo) >= similitudTitulo,
  );
  if (repetido) {
    motivos.push(
      `Se parece demasiado a «${repetido.titulo}», de los últimos ${diasDuplicado} días.`,
    );
  }
  return motivos;
}
