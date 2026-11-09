/**
 * BLOG: categorías, reglas de calidad y de dónde pueden venir las imágenes.
 * Cambiar algo aquí cambia la web, la API de n8n y el panel a la vez.
 */
import type { EstadoArticulo } from "@/generated/prisma/enums";

/** Categorías fijas. El slug va en la dirección (/blog/categoria/<slug>) y no debe cambiar. */
export const CATEGORIAS_BLOG = [
  {
    slug: "robotica-educativa",
    nombre: "Robótica educativa",
    descripcion: "Aprender robótica en casa o en clase, a cualquier edad y sin saber programar.",
  },
  {
    slug: "noticias-tech",
    nombre: "Noticias tech",
    descripcion: "Lo nuevo en robots, inteligencia artificial y electrónica, explicado sin tecnicismos.",
  },
  {
    slug: "tutoriales",
    nombre: "Tutoriales",
    descripcion: "Paso a paso para montar, programar y entender tus proyectos de robótica.",
  },
  {
    slug: "proyectos-maker",
    nombre: "Proyectos maker",
    descripcion: "Ideas y proyectos para construir con Arduino, ESP32, sensores e impresión 3D.",
  },
  {
    slug: "electronica",
    nombre: "Electrónica",
    descripcion: "Componentes, circuitos y conceptos básicos de electrónica para principiantes.",
  },
] as const;

export type CategoriaBlog = (typeof CATEGORIAS_BLOG)[number];

export function categoriaPorSlug(slug: string): CategoriaBlog | undefined {
  return CATEGORIAS_BLOG.find((c) => c.slug === slug);
}

/** Autor de los artículos de n8n */
export const AUTOR_AUTOMATICO = "Equipo Valentia";

/**
 * Bancos de imágenes con licencia libre (uso comercial sin permiso). Una imagen de otro sitio no se
 * acepta: copiar la foto de una noticia suele infringir derechos de autor, aunque se cite.
 * También valen las fotos de la propia web (/images/…).
 */
export const HOSTS_IMAGENES = ["images.unsplash.com", "images.pexels.com", "cdn.pixabay.com"];

/** Reglas de calidad: si un artículo de n8n no las cumple, espera la revisión del admin */
export const CALIDAD_BLOG = {
  minimoPalabras: 600,
  minimoSubtitulos: 2,
  /** Se compara con lo publicado o preparado en estos días */
  diasDuplicado: 30,
  /** Títulos con esta proporción de palabras en común (o más) se consideran el mismo tema */
  similitudTitulo: 0.6,
};

/** Máximos para Google */
export const LARGO_META = { titulo: 60, descripcion: 155, extracto: 200 };

/** Artículos por página en /blog */
export const ARTICULOS_POR_PAGINA = 9;

/** Palabras que se leen en un minuto (para «X min de lectura») */
export const PALABRAS_POR_MINUTO = 200;

/** Slugs que no puede tener un artículo: son carpetas de /blog */
export const SLUGS_RESERVADOS = ["pagina", "categoria", "rss.xml"];

export const estadosArticulo: Record<
  EstadoArticulo,
  { nombre: string; plural: string; tono: "neutro" | "aviso" | "acento" | "exito" | "error"; api: string }
> = {
  PENDIENTE: { nombre: "Pendiente", plural: "Pendientes", tono: "aviso", api: "pending" },
  EN_COLA: { nombre: "En cola", plural: "En cola", tono: "acento", api: "queued" },
  PUBLICADO: { nombre: "Publicado", plural: "Publicados", tono: "exito", api: "published" },
  RECHAZADO: { nombre: "Rechazado", plural: "Rechazados", tono: "error", api: "rejected" },
};
