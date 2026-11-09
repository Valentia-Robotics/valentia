import type { MetadataRoute } from "next";
import { CATEGORIAS_BLOG } from "@/config/blog";
import { guias } from "@/config/guias";
import { todosPublicados } from "@/lib/blog/articulos";
import { obtenerComponentes, obtenerKits } from "@/lib/catalogo";

/**
 * Se genera al compilar y se vuelve a leer de la base de datos cada 5 minutos como mucho: así el catálogo
 * cargado después del build (npm run seed:prod en el Pre-Deploy de Render) aparece sin volver a desplegar.
 * Los cambios del panel se ven al momento (refrescarTienda).
 */
export const revalidate = 300;

const web = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * sitemap.xml: las páginas públicas, con un enlace por cada kit a la venta.
 * Sin /login ni /registro: llevan «noindex» y Google avisa si el sitemap le manda a páginas que no debe indexar.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [kits, componentes, articulos] = await Promise.all([
    obtenerKits(),
    obtenerComponentes(),
    todosPublicados(),
  ]);
  // Solo las categorías que ya tienen algo publicado (una vacía no aporta nada a Google)
  const categoriasConArticulos = CATEGORIAS_BLOG.filter((c) =>
    articulos.some((a) => a.categoria === c.slug),
  );
  // [ruta, prioridad, fotos que salen en ella (Google Imágenes)]
  const paginas: [string, number, string[]?][] = [
    ["/", 1, ["/opengraph-image", ...kits.map((k) => `/images/redes/kits/${k.slug}.png`)]],
    ["/kits", 0.9],
    ["/componentes", 0.8],
    ["/configurador", 0.8],
    ["/guias", 0.7],
    ["/preguntas-frecuentes", 0.6],
    ["/legal/aviso-legal", 0.1],
    ["/legal/privacidad", 0.1],
    ["/legal/cookies", 0.1],
    ["/legal/condiciones", 0.2],
    ["/legal/devoluciones", 0.2],
  ];
  return [
    ...paginas.map(([ruta, prioridad, fotos]) => ({
      url: `${web}${ruta}`,
      changeFrequency: prioridad >= 0.8 ? ("weekly" as const) : ("yearly" as const),
      priority: prioridad,
      ...(fotos ? { images: fotos.map((f) => `${web}${f}`) } : {}),
    })),
    ...kits.map((kit) => ({
      url: `${web}/kits/${kit.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      // La foto 3D del kit (PNG). La tarjeta para compartir no: su dirección lleva un código que
      // pone Next (opengraph-image-xxxx) y sin él da 404
      images: [`${web}/images/redes/kits/${kit.slug}.png`],
    })),
    ...componentes.map((c) => ({
      url: `${web}/componentes/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      images: [`${web}/images/redes/componentes/${c.slug}.jpg`],
    })),
    ...guias.map((g) => ({
      url: `${web}/guias/${g.slug}`,
      lastModified: g.actualizada,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${web}/blog`,
      changeFrequency: "daily" as const,
      priority: 0.7,
      ...(articulos[0] ? { lastModified: articulos[0].actualizadoEn } : {}),
    },
    ...categoriasConArticulos.map((c) => ({
      url: `${web}/blog/categoria/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...articulos.map((a) => ({
      url: `${web}/blog/${a.slug}`,
      lastModified: a.actualizadoEn,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      ...(a.imagenUrl
        ? { images: [a.imagenUrl.startsWith("/") ? `${web}${a.imagenUrl}` : a.imagenUrl] }
        : {}),
    })),
  ];
}
