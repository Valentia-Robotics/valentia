import { marca } from "@/config/marca";

/**
 * DATOS ESTRUCTURADOS (schema.org en JSON-LD)
 * Son una "ficha" invisible para Google: le dicen quién es la tienda, cuál es su logo y, en cada kit,
 * el nombre, la foto, el precio y la nota de las opiniones. Con ellos Google puede mostrar el nombre de la web, el logo y los
 * productos con precio en los resultados. Se comprueban en https://search.google.com/test/rich-results
 */

const web = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Convierte una ruta propia ("/kits/coche") en dirección completa; deja igual las que ya lo son */
export function urlAbsoluta(ruta: string): string {
  return /^https?:\/\//.test(ruta) ? ruta : `${web}${ruta.startsWith("/") ? "" : "/"}${ruta}`;
}

/** La tienda y la web (portada): nombre, logo y dirección */
export function datosTienda() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${web}/#tienda`,
      name: marca.nombre,
      url: `${web}/`,
      logo: urlAbsoluta("/images/brand/icono-512.png"),
      description: marca.descripcion,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${web}/#web`,
      name: marca.nombre,
      url: `${web}/`,
      inLanguage: "es-ES",
      publisher: { "@id": `${web}/#tienda` },
    },
  ];
}

interface KitParaGoogle {
  slug: string;
  nombre: string;
  eslogan: string;
  descripcion: string;
  imagen: string;
  precioCentimos: number;
}

/** Reseñas publicadas del kit (media de 1 a 5, total y las más recientes) */
interface ResenasParaGoogle {
  media: number;
  total: number;
  resenas: { autor: string; estrellas: number; texto: string; fecha: Date }[];
}

/**
 * Un kit como producto. `aLaVenta` = false mientras la compra está cerrada (pagos desactivados):
 * así Google no anuncia como disponible algo que todavía no se puede comprar.
 */
export function datosKit(kit: KitParaGoogle, aLaVenta: boolean, resenas?: ResenasParaGoogle) {
  const url = urlAbsoluta(`/kits/${kit.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: kit.nombre,
    description: kit.descripcion || kit.eslogan,
    image: urlAbsoluta(kit.imagen),
    sku: kit.slug,
    url,
    brand: { "@type": "Brand", name: marca.nombre },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EUR",
      // En la BD el precio va en céntimos (IVA incluido); Google lo quiere en euros
      price: (kit.precioCentimos / 100).toFixed(2),
      availability: aLaVenta ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${urlAbsoluta("/")}#tienda` },
    },
    // Las estrellas solo si hay opiniones publicadas (Google no admite una nota sin reseñas)
    ...(resenas && resenas.total > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: resenas.media,
            reviewCount: resenas.total,
            bestRating: 5,
            worstRating: 1,
          },
          review: resenas.resenas.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.autor },
            datePublished: r.fecha.toISOString().slice(0, 10),
            reviewBody: r.texto,
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.estrellas,
              bestRating: 5,
              worstRating: 1,
            },
          })),
        }
      : {}),
  };
}
