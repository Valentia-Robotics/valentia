import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  ChevronLeft,
  CirclePlay,
  Clock,
  QrCode,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { FormularioAvisame } from "@/components/espera/FormularioAvisame";
import { BotonAnadirCarrito } from "@/components/tienda/BotonAnadirCarrito";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Estrellas } from "@/components/resenas/Estrellas";
import { SeccionResenas } from "@/components/resenas/SeccionResenas";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { nombreCategoria } from "@/config/categorias";
import { listaDeTextos, obtenerKitPorSlug, obtenerKits } from "@/lib/catalogo";
import { datosKit } from "@/lib/datosEstructurados";
import { compraAbierta } from "@/lib/pagos";
import { resenasDelKit } from "@/lib/resenas";
import { formatearMedia } from "@/lib/resenas/formato";
import { formatearPrecio } from "@/lib/utils";

/**
 * Se genera al compilar y se vuelve a leer de la base de datos cada 5 minutos como mucho: así el catálogo
 * cargado después del build (npm run seed:prod en el Pre-Deploy de Render) aparece sin volver a desplegar.
 * Los cambios del panel se ven al momento (refrescarTienda).
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

/** Crea de antemano una página por cada kit (así cargan al instante) */
export async function generateStaticParams() {
  const kits = await obtenerKits();
  return kits.map((kit) => ({ slug: kit.slug }));
}

/** Título y descripción de la pestaña y de Google para cada kit */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const kit = await obtenerKitPorSlug(slug);
  if (!kit) return { title: "Kit no encontrado" };
  return {
    title: kit.nombre,
    description: kit.eslogan,
    alternates: { canonical: `/kits/${kit.slug}` },
    // La imagen para redes es la general de la web (las de los kits son SVG, que las redes no admiten)
    openGraph: { title: kit.nombre, description: kit.eslogan, images: ["/opengraph-image"] },
  };
}

/** FICHA DE KIT: imagen, precio, descripción, componentes incluidos y temario del curso */
export default async function PaginaKit({ params }: Props) {
  const { slug } = await params;
  const kit = await obtenerKitPorSlug(slug);
  if (!kit) notFound();

  const resenas = await resenasDelKit(kit.id);
  const abierta = compraAbierta();
  const puntosFuertes = listaDeTextos(kit.puntosFuertes);
  const lecciones = kit.curso.lecciones;
  const minutosCurso = lecciones.reduce((total, l) => total + l.duracionMin, 0);
  const totalPiezas = kit.componentes.reduce((total, c) => total + c.cantidad, 0);

  return (
    <>
      <DatosEstructurados datos={datosKit(kit, abierta, resenas)} />

      {/* ---------- Cabecera: imagen + compra ---------- */}
      <section id="comprar" className="scroll-mt-nav">
        <Contenedor className="pt-6 pb-16 sm:pb-24">
          <Link
            href="/kits"
            className="inline-flex items-center gap-1 text-sm text-gris transition-colors hover:text-tinta"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Todos los kits
          </Link>

          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
            <div className="rounded-tarjeta bg-niebla p-6 sm:p-10">
              <Image
                src={kit.imagen}
                alt={`Ilustración del kit ${kit.nombre}`}
                width={800}
                height={600}
                priority
                unoptimized
                className="mx-auto h-auto w-full animate-entrada"
              />
            </div>

            <div>
              <div className="flex flex-wrap gap-2">
                <Etiqueta tono="acento">{kit.nivel}</Etiqueta>
                <Etiqueta>+{kit.edadMinima} años</Etiqueta>
                <Etiqueta>
                  <Wrench aria-hidden="true" className="size-3.5" />
                  {kit.tiempoMontaje} de montaje
                </Etiqueta>
              </div>
              <h1 className="mt-5 text-4xl font-medium sm:text-5xl">{kit.nombre}</h1>
              <p className="mt-3 text-lg text-gris">{kit.eslogan}</p>
              {resenas.total > 0 && (
                <a
                  href="#opiniones"
                  className="mt-3 inline-flex items-center gap-2 text-sm text-gris hover:text-tinta"
                >
                  <Estrellas nota={resenas.media} className="text-base" />
                  {formatearMedia(resenas.media)} · {resenas.total}{" "}
                  {resenas.total === 1 ? "opinión" : "opiniones"}
                </a>
              )}

              <p className="mt-6 text-3xl font-medium">{formatearPrecio(kit.precioCentimos)}</p>
              <p className="mt-1 text-sm text-gris">IVA incluido · Curso de regalo</p>

              <ul className="mt-6 space-y-2.5">
                {puntosFuertes.map((punto) => (
                  <li key={punto} className="flex gap-3">
                    <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-exito" />
                    <span>{punto}</span>
                  </li>
                ))}
              </ul>

              {abierta ? (
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <BotonAnadirCarrito
                    articulo={{
                      id: `kit:${kit.slug}`,
                      tipo: "kit",
                      slug: kit.slug,
                      nombre: kit.nombre,
                      precioCentimos: kit.precioCentimos,
                      imagen: kit.imagen,
                    }}
                    className="w-full sm:w-auto"
                  />
                  <Boton
                    href={`/configurador?kit=${kit.slug}`}
                    variante="secundario"
                    tamano="lg"
                    className="w-full sm:w-auto"
                  >
                    <SlidersHorizontal aria-hidden="true" className="size-5" strokeWidth={1.8} />
                    Personalizar este kit
                  </Boton>
                </div>
              ) : (
                <div className="mt-8 rounded-tarjeta bg-niebla p-5 sm:p-6">
                  <p className="font-medium">Todavía no lo vendemos online.</p>
                  <p className="mt-1 text-sm text-gris">
                    Estamos preparando las primeras unidades. Déjanos tu email y te avisamos en
                    cuanto puedas pedirlo.
                  </p>
                  <FormularioAvisame origen="kit" kitSlug={kit.slug} className="mt-4" />
                </div>
              )}
            </div>
          </div>
        </Contenedor>
      </section>

      {/* ---------- Descripción ---------- */}
      <section aria-labelledby="titulo-descripcion" className="bg-tinta py-20 text-white sm:py-28">
        <Contenedor className="aparecer max-w-3xl text-center">
          <h2 id="titulo-descripcion" className="text-3xl font-medium sm:text-5xl">
            Lo que vas a construir.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gris-claro sm:text-xl">
            {kit.descripcion}
          </p>
        </Contenedor>
      </section>

      {/* ---------- Componentes incluidos ---------- */}
      <section aria-labelledby="titulo-caja" className="py-20 sm:py-28">
        <Contenedor>
          <div className="aparecer max-w-2xl">
            <h2 id="titulo-caja" className="text-3xl font-medium sm:text-5xl">
              Qué hay en la caja.
            </h2>
            <p className="mt-3 text-lg text-gris">
              {totalPiezas} piezas, todo lo necesario para montarlo. Sin soldar.
            </p>
          </div>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kit.componentes.map(({ componente, cantidad }) => (
              <li
                key={componente.id}
                className="aparecer flex items-center gap-4 rounded-tarjeta bg-niebla p-4"
              >
                <Image
                  src={componente.imagen}
                  alt=""
                  width={80}
                  height={80}
                  unoptimized
                  className="size-20 shrink-0 rounded-control bg-white p-1"
                />
                <div className="min-w-0">
                  <p className="text-xs text-gris">{nombreCategoria(componente.categoria)}</p>
                  <h3 className="font-sans text-base font-medium">
                    {cantidad > 1 && <span className="text-acento">{cantidad} × </span>}
                    {componente.nombre}
                  </h3>
                  <p className="mt-0.5 text-sm text-gris">{componente.resumen}</p>
                </div>
              </li>
            ))}
          </ul>
        </Contenedor>
      </section>

      {/* ---------- Temario del curso ---------- */}
      <section aria-labelledby="titulo-curso" className="bg-niebla py-20 sm:py-28">
        <Contenedor className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="aparecer">
            <p className="text-sm font-medium tracking-wide text-acento uppercase">
              Curso incluido
            </p>
            <h2 id="titulo-curso" className="mt-3 text-3xl font-medium sm:text-5xl">
              {kit.curso.titulo}
            </h2>
            <p className="mt-4 text-lg text-gris">{kit.curso.descripcion}</p>
            <p className="mt-6 flex items-center gap-2 text-sm text-gris">
              <Clock aria-hidden="true" className="size-4" />
              {lecciones.length} lecciones · {minutosCurso} minutos de vídeo
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-gris">
              <QrCode aria-hidden="true" className="size-4" />
              Se activa con el código QR de la caja
            </p>
          </div>

          <ol className="aparecer divide-y divide-linea overflow-hidden rounded-tarjeta bg-white ring-1 ring-linea">
            {lecciones.map((leccion) => (
              <li key={leccion.slug} className="flex items-center gap-4 p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tinta font-titulo text-white">
                  {leccion.orden}
                </span>
                <span className="flex-1 font-medium">{leccion.titulo}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-sm text-gris">
                  <CirclePlay aria-hidden="true" className="size-4" />
                  {leccion.duracionMin} min
                </span>
              </li>
            ))}
          </ol>
        </Contenedor>
      </section>

      {/* ---------- Opiniones de los clientes ---------- */}
      <SeccionResenas slug={kit.slug} resumen={resenas} />
    </>
  );
}
