import type { MetadataRoute } from "next";
import { obtenerKits } from "@/lib/catalogo";

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
  const kits = await obtenerKits();
  // [ruta, prioridad, fotos que salen en ella (Google Imágenes)]
  const paginas: [string, number, string[]?][] = [
    ["/", 1, ["/opengraph-image", ...kits.map((k) => `/images/redes/kits/${k.slug}.png`)]],
    ["/kits", 0.9],
    ["/componentes", 0.8],
    ["/configurador", 0.8],
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
      // La foto 3D del kit (PNG) y su tarjeta para compartir
      images: [
        `${web}/images/redes/kits/${kit.slug}.png`,
        `${web}/kits/${kit.slug}/opengraph-image`,
      ],
    })),
  ];
}
