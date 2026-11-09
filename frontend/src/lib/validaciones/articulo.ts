/**
 * FORMULARIO DE UN ARTÍCULO (panel de admin y de editor)
 */
import { z } from "zod";
import { CATEGORIAS_BLOG } from "@/config/blog";
import type { DatosArticulo } from "@/lib/blog/articulos";
import { imagenPermitida } from "@/lib/blog/texto";
import { texto, textos, type EstadoFormulario } from "@/lib/admin/formularios";

const opcional = (maximo: number) => z.string().trim().max(maximo, `Máximo ${maximo} caracteres`);

export const esquemaArticulo = z.object({
  titulo: z.string().trim().min(5, "Escribe un título").max(200, "Máximo 200 caracteres"),
  slug: z
    .string()
    .trim()
    .max(80, "Máximo 80 caracteres")
    .regex(/^[a-z0-9-]*$/, "Solo minúsculas, números y guiones (sin tildes)"),
  contenidoMd: z.string().trim().min(1, "Escribe el artículo").max(100_000, "Demasiado largo"),
  extracto: opcional(400),
  palabraClave: opcional(100),
  metaTitulo: opcional(120),
  metaDescripcion: opcional(300),
  categoria: z.enum(
    CATEGORIAS_BLOG.map((c) => c.slug) as [string, ...string[]],
    { error: "Elige una categoría" },
  ),
  etiquetas: z
    .string()
    .max(600)
    .transform((t) =>
      [...new Set(t.split(",").map((e) => e.trim().replace(/^#+/, "").toLowerCase()))]
        .filter(Boolean)
        .slice(0, 15),
    ),
  imagenUrl: opcional(2000).refine(
    (v) => !v || imagenPermitida(v),
    "Solo imágenes de Unsplash, Pexels o Pixabay (licencia libre), o de /images/ de la web",
  ),
  imagenAlt: opcional(300),
  imagenCredito: opcional(200),
  fuenteUrl: opcional(2000).refine(
    (v) => !v || /^https?:\/\/\S+$/.test(v),
    "Pega la dirección completa, empezando por https://",
  ),
  fuenteTitulo: opcional(300),
  kitsRelacionados: z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).max(10),
});

/** Lee el formulario. Devuelve los datos o el estado con los errores para enseñarlos. */
export function leerArticulo(
  formulario: FormData,
): { datos: DatosArticulo; error: null } | { datos: null; error: EstadoFormulario } {
  const leido = esquemaArticulo.safeParse({
    titulo: texto(formulario, "titulo"),
    slug: texto(formulario, "slug"),
    contenidoMd: texto(formulario, "contenidoMd"),
    extracto: texto(formulario, "extracto"),
    palabraClave: texto(formulario, "palabraClave"),
    metaTitulo: texto(formulario, "metaTitulo"),
    metaDescripcion: texto(formulario, "metaDescripcion"),
    categoria: texto(formulario, "categoria"),
    etiquetas: texto(formulario, "etiquetas"),
    imagenUrl: texto(formulario, "imagenUrl"),
    imagenAlt: texto(formulario, "imagenAlt"),
    imagenCredito: texto(formulario, "imagenCredito"),
    fuenteUrl: texto(formulario, "fuenteUrl"),
    fuenteTitulo: texto(formulario, "fuenteTitulo"),
    kitsRelacionados: textos(formulario, "kitsRelacionados"),
  });
  if (!leido.success) {
    const errores: Record<string, string> = {};
    for (const p of leido.error.issues) errores[String(p.path[0] ?? "_")] ??= p.message;
    return { datos: null, error: { ok: false, mensaje: "Revisa los campos marcados en rojo.", errores } };
  }
  const d = leido.data;
  if (d.imagenUrl && !d.imagenAlt) {
    return {
      datos: null,
      error: {
        ok: false,
        mensaje: "Revisa los campos marcados en rojo.",
        errores: { imagenAlt: "Describe la imagen (para Google y para quien no ve)" },
      },
    };
  }
  return { datos: { ...d, slug: d.slug || undefined }, error: null };
}
