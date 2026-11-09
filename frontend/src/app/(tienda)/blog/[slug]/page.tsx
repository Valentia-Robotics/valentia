import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ChevronRight, ExternalLink } from "lucide-react";
import { ImagenArticulo } from "@/components/blog/ImagenArticulo";
import { fechaLarga, TarjetaArticulo } from "@/components/blog/TarjetaArticulo";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { Contenedor } from "@/components/ui/Contenedor";
import { categoriaPorSlug } from "@/config/blog";
import { articuloPublicado, articulosRelacionados } from "@/lib/blog/articulos";
import { extractoDe, minutosLectura } from "@/lib/blog/texto";
import { obtenerKits } from "@/lib/catalogo";
import { datosArticuloBlog, datosMigas } from "@/lib/datosEstructurados";
import { metadatosPagina } from "@/lib/metadatos";
import { precioDeKit } from "@/lib/utils";

/** Se genera la primera vez que alguien lo visita y se renueva al editarlo (refrescarBlog) */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { articulo } = await articuloPublicado(slug);
  if (!articulo) return { title: "Artículo no encontrado" };
  return metadatosPagina({
    titulo: articulo.metaTitulo,
    tituloExacto: true,
    descripcion: articulo.metaDescripcion,
    ruta: `/blog/${articulo.slug}`,
    tipo: "article",
    imagen: articulo.imagenUrl
      ? { url: articulo.imagenUrl, alt: articulo.imagenAlt ?? articulo.titulo }
      : undefined,
  });
}

/** UN ARTÍCULO DEL BLOG */
export default async function PaginaArticulo({ params }: Props) {
  const { slug } = await params;
  const { articulo, redirigirA } = await articuloPublicado(slug);
  // Si cambió el slug, la dirección vieja lleva a la nueva para siempre (301)
  if (redirigirA) permanentRedirect(`/blog/${redirigirA}`);
  if (!articulo || !articulo.publicadoEn) notFound();

  const categoria = categoriaPorSlug(articulo.categoria);
  const [relacionados, todosKits] = await Promise.all([
    articulosRelacionados(articulo.id, articulo.categoria),
    obtenerKits(),
  ]);
  const kits = todosKits.filter((k) => articulo.kitsRelacionados.includes(k.slug));
  const actualizado = articulo.actualizadoEn.getTime() - articulo.publicadoEn.getTime() > 86_400_000;
  // Si el extracto es el primer párrafo (no lo escribió nadie aparte), no se repite como entradilla
  const extractoRepetido = extractoDe(articulo.contenidoHtml) === articulo.extracto;

  const migas = [
    { nombre: "Inicio", ruta: "/" },
    { nombre: "Blog", ruta: "/blog" },
    ...(categoria ? [{ nombre: categoria.nombre, ruta: `/blog/categoria/${categoria.slug}` }] : []),
    { nombre: articulo.titulo, ruta: `/blog/${articulo.slug}` },
  ];

  return (
    <>
      <DatosEstructurados
        datos={datosArticuloBlog({
          ...articulo,
          publicadoEn: articulo.publicadoEn,
          categoriaNombre: categoria?.nombre ?? "Blog",
          automatico: articulo.origen === "AUTO",
        })}
      />
      <DatosEstructurados datos={datosMigas(migas)} />

      <Contenedor className="pt-6 pb-16 sm:pb-24">
        <nav aria-label="Migas de pan">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-gris">
            {migas.slice(0, -1).map((m) => (
              <li key={m.ruta} className="flex items-center gap-1">
                <Link href={m.ruta} className="hover:text-tinta">
                  {m.nombre}
                </Link>
                <ChevronRight aria-hidden="true" className="size-3.5" />
              </li>
            ))}
          </ol>
        </nav>

        <article className="mx-auto mt-8 max-w-2xl">
          <header>
            {categoria && (
              <Link
                href={`/blog/categoria/${categoria.slug}`}
                className="text-sm font-medium tracking-wide text-acento uppercase"
              >
                {categoria.nombre}
              </Link>
            )}
            <h1 className="mt-3 text-4xl font-medium text-balance sm:text-5xl">{articulo.titulo}</h1>
            <p className="mt-4 text-sm text-gris">
              {articulo.autorNombre} ·{" "}
              <time dateTime={articulo.publicadoEn.toISOString()}>
                {fechaLarga.format(articulo.publicadoEn)}
              </time>
              {actualizado && (
                <>
                  {" "}
                  · Actualizado el{" "}
                  <time dateTime={articulo.actualizadoEn.toISOString()}>
                    {fechaLarga.format(articulo.actualizadoEn)}
                  </time>
                </>
              )}{" "}
              · {minutosLectura(articulo.palabras)} min de lectura
            </p>
            {!extractoRepetido && (
              <p className="mt-8 text-xl leading-relaxed text-tinta/85">{articulo.extracto}</p>
            )}
          </header>

          {articulo.imagenUrl && (
            <figure className="mt-10">
              <ImagenArticulo
                url={articulo.imagenUrl}
                alt={articulo.imagenAlt ?? ""}
                ancho={1200}
                prioridad
                className="aspect-video w-full rounded-tarjeta object-cover"
              />
              {articulo.imagenCredito && (
                <figcaption className="mt-2 text-xs text-gris">
                  Foto: {articulo.imagenCredito}
                </figcaption>
              )}
            </figure>
          )}

          {/* HTML limpio: sale de markdownAHtml (sanitize-html) al guardar el artículo */}
          <div
            className="articulo mt-10"
            dangerouslySetInnerHTML={{ __html: articulo.contenidoHtml }}
          />

          {articulo.fuenteUrl && (
            <p className="mt-10 border-t border-linea pt-6 text-sm text-gris">
              Fuente:{" "}
              <a
                href={articulo.fuenteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-acento underline underline-offset-4"
              >
                {articulo.fuenteTitulo || new URL(articulo.fuenteUrl).hostname}
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            </p>
          )}

          {articulo.etiquetas.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Etiquetas">
              {articulo.etiquetas.map((e) => (
                <li key={e} className="rounded-boton bg-niebla px-3 py-1 text-xs text-gris">
                  #{e}
                </li>
              ))}
            </ul>
          )}
        </article>

        {kits.length > 0 && (
          <section aria-labelledby="titulo-kits" className="mx-auto mt-20 max-w-4xl">
            <h2 id="titulo-kits" className="text-2xl font-medium sm:text-3xl">
              Para ponerlo en práctica
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {kits.map((kit) => (
                <li key={kit.slug}>
                  <Link
                    href={`/kits/${kit.slug}`}
                    className="flex items-center gap-4 rounded-tarjeta bg-niebla p-4 transition-colors hover:bg-linea/60"
                  >
                    <Image
                      src={kit.imagen}
                      alt=""
                      width={120}
                      height={90}
                      unoptimized
                      className="h-20 w-auto shrink-0"
                    />
                    <span>
                      <span className="block font-medium">{kit.nombre}</span>
                      <span className="mt-1 block text-sm text-gris">
                        {precioDeKit(kit.precioCentimos)} · Curso incluido
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {relacionados.length > 0 && (
          <section aria-labelledby="titulo-relacionados" className="mt-20">
            <h2 id="titulo-relacionados" className="text-2xl font-medium sm:text-3xl">
              Sigue leyendo
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relacionados.map((a) => (
                <TarjetaArticulo key={a.slug} articulo={a} />
              ))}
            </div>
          </section>
        )}
      </Contenedor>
    </>
  );
}
