/**
 * /blog/rss.xml: los últimos 30 artículos, para lectores de noticias (Feedly…) y para n8n.
 * Se renueva al publicar (refrescarBlog) y, como mucho, cada 5 minutos.
 */
import { categoriaPorSlug } from "@/config/blog";
import { marca } from "@/config/marca";
import { todosPublicados, urlArticulo } from "@/lib/blog/articulos";

export const revalidate = 300;

const escapar = (texto: string) =>
  texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function GET() {
  const web = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const articulos = (await todosPublicados()).slice(0, 30);
  const items = articulos
    .map((a) => {
      const url = urlArticulo(a.slug);
      return `    <item>
      <title>${escapar(a.titulo)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapar(a.extracto)}</description>
      <category>${escapar(categoriaPorSlug(a.categoria)?.nombre ?? a.categoria)}</category>
      ${a.publicadoEn ? `<pubDate>${a.publicadoEn.toUTCString()}</pubDate>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapar(`Blog de ${marca.nombre}`)}</title>
    <link>${web}/blog</link>
    <description>Robótica educativa, electrónica, proyectos maker y tutoriales.</description>
    <language>es-ES</language>
    <atom:link href="${web}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
