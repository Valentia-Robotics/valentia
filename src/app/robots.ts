import type { MetadataRoute } from "next";

const web = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** robots.txt: qué pueden visitar los buscadores (las zonas privadas no) */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/editor",
        "/api/",
        "/cuenta",
        "/cursos",
        "/carrito",
        "/checkout",
        "/pedido/",
        "/activar",
        "/verificar",
        "/recuperar",
        "/dev/",
        "/diseno",
      ],
    },
    sitemap: `${web}/sitemap.xml`,
  };
}
