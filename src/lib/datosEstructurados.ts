import { marca } from "@/config/marca";
import { tienda } from "@/config/tienda";

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
      // Tienda online (un tipo de organización): Google la usa para el panel de la marca
      "@type": "OnlineStore",
      "@id": `${web}/#tienda`,
      name: marca.nombre,
      alternateName: "Valentia Robotics",
      url: `${web}/`,
      logo: urlAbsoluta("/images/brand/icono-512.png"),
      image: urlAbsoluta("/opengraph-image"),
      description: marca.descripcion,
      slogan: marca.lema,
      knowsLanguage: "es-ES",
      areaServed: tienda.envio.provincias.map((p) => ({
        "@type": "AdministrativeArea",
        name: p.nombre,
      })),
      hasMerchantReturnPolicy: datosDevolucion(),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${web}/#web`,
      name: marca.nombre,
      alternateName: ["Valentia Robotics", "valentiarobotics.com"],
      description: marca.descripcion,
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
  edadMinima?: number;
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
    // Google prefiere fotos normales (PNG/JPG): la foto 3D del kit en PNG y, por si acaso, la de la web
    image: [urlAbsoluta(`/images/redes/kits/${kit.slug}.png`), urlAbsoluta(kit.imagen)],
    sku: kit.slug,
    category: "Juguetes y juegos > Juguetes educativos > Kits de robótica",
    ...(kit.edadMinima
      ? { audience: { "@type": "PeopleAudience", suggestedMinAge: kit.edadMinima } }
      : {}),
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
      // Un kit gratis es solo un curso en vídeo: no hay nada que enviar ni devolver
      ...(kit.precioCentimos > 0
        ? {
            shippingDetails: datosEnvio(kit.precioCentimos),
            hasMerchantReturnPolicy: datosDevolucion(),
          }
        : {}),
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

/** Un componente suelto como producto (ficha /componentes/[slug]) */
export function datosComponente(
  c: { slug: string; nombre: string; descripcion: string; precioCentimos: number; stock: number },
  aLaVenta: boolean,
) {
  const url = urlAbsoluta(`/componentes/${c.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: c.nombre,
    description: c.descripcion,
    image: [urlAbsoluta(`/images/redes/componentes/${c.slug}.jpg`)],
    sku: c.slug,
    category: "Electrónica > Componentes electrónicos",
    url,
    brand: { "@type": "Brand", name: marca.nombre },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EUR",
      price: (c.precioCentimos / 100).toFixed(2),
      availability:
        aLaVenta && c.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${urlAbsoluta("/")}#tienda` },
      shippingDetails: datosEnvio(c.precioCentimos),
      hasMerchantReturnPolicy: datosDevolucion(),
    },
  };
}

/** Una guía (artículo) de /guias */
export function datosGuia(g: {
  slug: string;
  titulo: string;
  descripcion: string;
  publicada: string;
  actualizada: string;
  kits: string[];
}) {
  const url = urlAbsoluta(`/guias/${g.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.titulo,
    description: g.descripcion,
    url,
    mainEntityOfPage: url,
    // La foto del primer kit del que habla (o la de la portada)
    image: [urlAbsoluta(g.kits[0] ? `/images/redes/kits/${g.kits[0]}.png` : "/opengraph-image")],
    datePublished: g.publicada,
    dateModified: g.actualizada,
    inLanguage: "es-ES",
    author: { "@type": "Organization", name: marca.nombre, url: urlAbsoluta("/") },
    publisher: { "@id": `${urlAbsoluta("/")}#tienda` },
  };
}

/** Gastos y plazo de envío de un producto (gratis si él solo ya llega al mínimo) */
function datosEnvio(precioCentimos: number) {
  const { envio } = tienda;
  const coste = precioCentimos >= envio.gratisDesdeCentimos ? 0 : envio.costeCentimos;
  // "2–4 días laborables" → 2 y 4
  const [minimo = 2, maximo = 4] = (envio.plazo.match(/\d+/g) ?? []).map(Number);
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: (coste / 100).toFixed(2), currency: "EUR" },
    shippingDestination: envio.provincias.map((p) => ({
      "@type": "DefinedRegion",
      addressCountry: "ES",
      postalCodeBegin: `${p.prefijoCP}000`,
      postalCodeEnd: `${p.prefijoCP}999`,
    })),
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: minimo,
        maxValue: maximo,
        unitCode: "DAY",
      },
    },
  };
}

/** Devoluciones: los días del derecho de desistimiento, por correo */
function datosDevolucion() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "ES",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: tienda.diasDesistimiento,
    returnMethod: "https://schema.org/ReturnByMail",
    // Como dice /legal/devoluciones: el envío de vuelta lo paga el cliente
    returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
    merchantReturnLink: urlAbsoluta("/legal/devoluciones"),
  };
}

/** Migas de pan («Inicio › Kits › Coche»): Google las enseña en lugar de la dirección */
export function datosMigas(pasos: { nombre: string; ruta: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: pasos.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.nombre,
      item: urlAbsoluta(p.ruta),
    })),
  };
}

/** Lista de productos de una página (por ejemplo, /kits) */
export function datosListaKits(kits: { slug: string; nombre: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: kits.map((k, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: k.nombre,
      url: urlAbsoluta(`/kits/${k.slug}`),
    })),
  };
}

/** Preguntas frecuentes: Google puede mostrarlas desplegables bajo el resultado */
export function datosPreguntas(preguntas: { pregunta: string; respuesta: string[] }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: preguntas.map((p) => ({
      "@type": "Question",
      name: p.pregunta,
      acceptedAnswer: { "@type": "Answer", text: p.respuesta.join(" ") },
    })),
  };
}
