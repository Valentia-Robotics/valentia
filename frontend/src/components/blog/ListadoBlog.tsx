import Link from "next/link";
import { notFound } from "next/navigation";
import { Newspaper, Rss } from "lucide-react";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { Contenedor } from "@/components/ui/Contenedor";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { CATEGORIAS_BLOG, categoriaPorSlug } from "@/config/blog";
import { articulosPublicados } from "@/lib/blog/articulos";
import { datosMigas } from "@/lib/datosEstructurados";
import { metadatosPagina } from "@/lib/metadatos";
import { cn } from "@/lib/utils";
import { CabeceraPagina } from "@/components/ui/CabeceraPagina";
import { TarjetaArticulo } from "./TarjetaArticulo";

/** /blog, /blog/pagina/2, /blog/categoria/tutoriales, /blog/categoria/tutoriales/pagina/2 */
export const rutaListado = (categoria: string | undefined, pagina: number) =>
  `/blog${categoria ? `/categoria/${categoria}` : ""}${pagina > 1 ? `/pagina/${pagina}` : ""}`;

/** El número de página de la dirección: solo enteros desde 2 (la 1 es la dirección sin /pagina) */
export function leerPagina(texto: string): number {
  const n = Number(texto);
  if (!Number.isInteger(n) || n < 2 || n > 1000) notFound();
  return n;
}

export function metadatosListado(categoria: string | undefined, pagina: number) {
  const cat = categoria ? categoriaPorSlug(categoria) : undefined;
  if (categoria && !cat) return { title: "Categoría no encontrada" };
  const sufijo = pagina > 1 ? ` (página ${pagina})` : "";
  return metadatosPagina({
    titulo: cat
      ? `${cat.nombre}: blog de robótica${sufijo}`
      : `Blog de robótica y electrónica${sufijo}`,
    descripcion: cat
      ? cat.descripcion
      : "Artículos de robótica educativa, electrónica, proyectos maker y tutoriales para aprender en casa, sin saber programar.",
    ruta: rutaListado(categoria, pagina),
  });
}

/**
 * Un listado del blog. La paginación son enlaces normales (/pagina/2…): Google los sigue y llega a
 * todos los artículos, cosa que no haría con un botón «Cargar más».
 */
export async function ListadoBlog({ categoria, pagina }: { categoria?: string; pagina: number }) {
  const cat = categoria ? categoriaPorSlug(categoria) : undefined;
  if (categoria && !cat) notFound();
  const { articulos, paginas } = await articulosPublicados({ pagina, categoria });
  // Una página de más allá del final no existe (salvo la primera, que puede estar vacía)
  if (pagina > 1 && articulos.length === 0) notFound();

  const migas = [
    { nombre: "Inicio", ruta: "/" },
    { nombre: "Blog", ruta: "/blog" },
    ...(cat ? [{ nombre: cat.nombre, ruta: rutaListado(categoria, 1) }] : []),
  ];

  return (
    <>
      <CabeceraPagina
        etiqueta="Blog de Valentia"
        titulo={cat ? cat.nombre : "Aprende robótica, poco a poco."}
        entradilla={
          cat
            ? cat.descripcion
            : "Noticias, tutoriales y proyectos de robótica y electrónica, explicados para que cualquiera los entienda."
        }
      >
        <a
          href="/blog/rss.xml"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-white/70 hover:text-white"
        >
          <Rss aria-hidden="true" className="size-4" />
          RSS
        </a>
      </CabeceraPagina>
      <Contenedor className="py-12 sm:py-16">
        <DatosEstructurados datos={datosMigas(migas)} />

        <nav
          aria-label="Categorías del blog"
          className="-mx-4 mt-10 sin-barra overflow-x-auto px-4"
        >
          <ul className="flex gap-2">
            {[{ slug: undefined, nombre: "Todo" }, ...CATEGORIAS_BLOG].map((c) => {
              const activa = c.slug === categoria;
              return (
                <li key={c.nombre} className="shrink-0">
                  <Link
                    href={rutaListado(c.slug, 1)}
                    aria-current={activa ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-boton px-4 text-sm transition-colors",
                      activa ? "bg-tinta text-white" : "bg-niebla text-tinta hover:bg-linea/70",
                    )}
                  >
                    {c.nombre}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {articulos.length === 0 ? (
          <EstadoVacio
            icono={Newspaper}
            titulo="Pronto habrá artículos aquí"
            texto="Mientras tanto, nuestras guías explican lo básico de la robótica, paso a paso."
          >
            <Link href="/guias" className="text-acento underline underline-offset-4">
              Ver las guías
            </Link>
          </EstadoVacio>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articulos.map((a) => (
              <TarjetaArticulo key={a.slug} articulo={a} />
            ))}
          </div>
        )}

        {paginas > 1 && (
          <nav
            aria-label="Páginas"
            className="mt-12 flex flex-wrap items-center justify-center gap-2"
          >
            {pagina > 1 && (
              <Link
                rel="prev"
                href={rutaListado(categoria, pagina - 1)}
                className="px-3 py-2 text-sm text-acento"
              >
                ‹ Anterior
              </Link>
            )}
            {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={rutaListado(categoria, n)}
                aria-current={n === pagina ? "page" : undefined}
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-full text-sm",
                  n === pagina ? "bg-tinta text-white" : "text-tinta hover:bg-niebla",
                )}
              >
                {n}
              </Link>
            ))}
            {pagina < paginas && (
              <Link
                rel="next"
                href={rutaListado(categoria, pagina + 1)}
                className="px-3 py-2 text-sm text-acento"
              >
                Siguiente ›
              </Link>
            )}
          </nav>
        )}
      </Contenedor>
    </>
  );
}
