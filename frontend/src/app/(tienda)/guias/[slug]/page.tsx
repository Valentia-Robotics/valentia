import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { GuiasRelacionadas } from "@/components/guias/GuiasRelacionadas";
import { TextoConEnlaces } from "@/components/guias/TextoConEnlaces";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { Contenedor } from "@/components/ui/Contenedor";
import { guias, obtenerGuia } from "@/config/guias";
import { obtenerComponentes, obtenerKits } from "@/lib/catalogo";
import { datosGuia, datosMigas } from "@/lib/datosEstructurados";
import { metadatosPagina } from "@/lib/metadatos";
import { formatearPrecio } from "@/lib/utils";

/** Los kits y piezas del final salen de la BD: se releen cada 5 minutos como mucho */
export const revalidate = 300;
export const dynamicParams = false;

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return guias.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guia = obtenerGuia(slug);
  if (!guia) return { title: "Guía no encontrada" };
  return metadatosPagina({
    titulo: guia.tituloSeo ?? guia.titulo,
    descripcion: guia.descripcion,
    ruta: `/guias/${guia.slug}`,
    tipo: "article",
  });
}

const fecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });

/** UNA GUÍA: el artículo y, al final, los kits y piezas para ponerlo en práctica */
export default async function PaginaGuia({ params }: Props) {
  const { slug } = await params;
  const guia = obtenerGuia(slug);
  if (!guia) notFound();

  const [todosKits, todosComponentes] = await Promise.all([obtenerKits(), obtenerComponentes()]);
  const kits = todosKits.filter((k) => guia.kits.includes(k.slug));
  const componentes = todosComponentes.filter((c) => guia.componentes.includes(c.slug));
  const otras = guias.filter((g) => g.slug !== guia.slug).slice(0, 3);

  return (
    <>
      <DatosEstructurados datos={datosGuia(guia)} />
      <DatosEstructurados
        datos={datosMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Guías", ruta: "/guias" },
          { nombre: guia.titulo, ruta: `/guias/${guia.slug}` },
        ])}
      />
      <Contenedor className="pt-6 pb-16 sm:pb-24">
        <Link
          href="/guias"
          className="inline-flex items-center gap-1 text-sm text-gris transition-colors hover:text-tinta"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Todas las guías
        </Link>

        <article className="mx-auto mt-8 max-w-2xl">
          <header>
            <p className="etiqueta-taller">Guía</p>
            <h1 className="titular-cartel mt-4 text-5xl font-medium text-balance sm:text-6xl">
              {guia.titulo}
            </h1>
            <p className="mt-4 font-mono text-xs text-tinta/70">
              <time dateTime={guia.actualizada}>
                {fecha.format(new Date(`${guia.actualizada}T12:00:00`))}
              </time>{" "}
              · {guia.minutos} min de lectura
            </p>
            <p className="mt-8 text-xl leading-relaxed text-tinta/85">{guia.entradilla}</p>
          </header>

          {guia.secciones.map((seccion) => (
            <section key={seccion.titulo} className="mt-12">
              <h2 className="text-2xl font-medium sm:text-3xl">{seccion.titulo}</h2>
              {seccion.parrafos.map((parrafo) => (
                <p key={parrafo} className="mt-4 text-lg leading-relaxed text-tinta/80">
                  <TextoConEnlaces texto={parrafo} />
                </p>
              ))}
              {seccion.lista && (
                <ul className="mt-4 list-disc space-y-2 pl-6 text-lg leading-relaxed text-tinta/80 marker:text-acento">
                  {seccion.lista.map((punto) => (
                    <li key={punto}>
                      <TextoConEnlaces texto={punto} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        {(kits.length > 0 || componentes.length > 0) && (
          <section aria-labelledby="titulo-practica" className="mx-auto mt-20 max-w-4xl">
            <h2 id="titulo-practica" className="text-2xl font-medium sm:text-3xl">
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
                      alt={kit.nombre}
                      width={120}
                      height={90}
                      unoptimized
                      className="w-28 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs text-gris">Kit con curso</span>
                      <span className="block font-medium">{kit.nombre}</span>
                      <span className="block text-sm text-gris">
                        {formatearPrecio(kit.precioCentimos)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {componentes.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/componentes/${c.slug}`}
                    className="flex items-center gap-4 rounded-tarjeta bg-niebla p-4 transition-colors hover:bg-linea/60"
                  >
                    <Image
                      src={c.imagen}
                      alt={c.nombre}
                      width={80}
                      height={80}
                      unoptimized
                      className="size-20 shrink-0 rounded-control bg-white p-1"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs text-gris">Componente</span>
                      <span className="block font-medium">{c.nombre}</span>
                      <span className="block text-sm text-gris">
                        {formatearPrecio(c.precioCentimos)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mx-auto mt-20 max-w-4xl">
          <GuiasRelacionadas guias={otras} titulo="Otras guías" />
        </div>
      </Contenedor>
    </>
  );
}
