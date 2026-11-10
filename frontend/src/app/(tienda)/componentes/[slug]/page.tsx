import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import { GuiasRelacionadas } from "@/components/guias/GuiasRelacionadas";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { BotonAnadirCarrito } from "@/components/tienda/BotonAnadirCarrito";
import { TarjetaComponente } from "@/components/tienda/TarjetaComponente";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { nombreCategoria } from "@/config/categorias";
import { guiasRelacionadas } from "@/config/guias";
import { obtenerComponentePorSlug, obtenerComponentes } from "@/lib/catalogo";
import { datosComponente, datosMigas } from "@/lib/datosEstructurados";
import { fichaTecnica } from "@/lib/fichaTecnica";
import { compraAbierta } from "@/lib/pagos";
import { metadatosPagina } from "@/lib/metadatos";
import { formatearPrecio } from "@/lib/utils";
import { textoTienda } from "@/config/stock";

/**
 * Se genera al compilar y se vuelve a leer de la base de datos cada 5 minutos como mucho
 * (igual que /componentes): un componente cargado o editado después del build aparece solo.
 */
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const componentes = await obtenerComponentes();
  return componentes.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await obtenerComponentePorSlug(slug);
  if (!c) return { title: "Componente no encontrado" };
  return metadatosPagina({
    titulo: `${c.nombre}: comprar online`,
    descripcion: recortar(`${c.resumen} ${c.descripcion}`, 158),
    ruta: `/componentes/${c.slug}`,
  });
}

/** Acorta un texto a «maximo» letras sin partir palabras (Google corta las descripciones largas) */
function recortar(texto: string, maximo: number) {
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo).replace(/\s+\S*$/, "")}…`;
}

/** FICHA DE UN COMPONENTE: foto, precio, explicación, datos técnicos y kits que lo llevan */
export default async function PaginaComponente({ params }: Props) {
  const { slug } = await params;
  const componente = await obtenerComponentePorSlug(slug);
  if (!componente) notFound();

  const agotado = componente.stock === 0;
  const parecidos = (await obtenerComponentes())
    .filter((c) => c.categoria === componente.categoria && c.slug !== componente.slug)
    .slice(0, 3);
  const guias = guiasRelacionadas("componentes", componente.slug);

  return (
    <>
      <DatosEstructurados datos={datosComponente(componente, compraAbierta())} />
      <DatosEstructurados
        datos={datosMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Componentes", ruta: "/componentes" },
          { nombre: componente.nombre, ruta: `/componentes/${componente.slug}` },
        ])}
      />
      <Contenedor className="pt-6 pb-16 sm:pb-24">
        <Link
          href="/componentes"
          className="inline-flex items-center gap-1 text-sm text-gris transition-colors hover:text-tinta"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Todos los componentes
        </Link>

        <div className="mt-6 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="rounded-tarjeta bg-niebla p-6 sm:p-10">
            <Image
              src={componente.imagen}
              alt={`Foto de ${componente.nombre}`}
              width={480}
              height={480}
              priority
              unoptimized
              className="mx-auto aspect-square h-auto w-full max-w-sm"
            />
          </div>

          <div>
            <Etiqueta tono="acento">{nombreCategoria(componente.categoria)}</Etiqueta>
            <h1 className="mt-5 text-4xl font-medium sm:text-5xl">{componente.nombre}</h1>
            <p className="mt-3 text-lg text-gris">{componente.resumen}</p>
            <p className="mt-6 text-3xl font-medium">
              {formatearPrecio(componente.precioCentimos)}
            </p>
            <p className="mt-1 text-sm text-gris">
              IVA incluido · {textoTienda(componente.stock, componente.enReposicion)}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <BotonAnadirCarrito
                articulo={{
                  id: `componente:${componente.slug}`,
                  tipo: "componente",
                  slug: componente.slug,
                  nombre: componente.nombre,
                  precioCentimos: componente.precioCentimos,
                  imagen: componente.imagen,
                }}
                disabled={agotado}
                className="w-full sm:w-auto"
              />
              <Boton
                href="/configurador"
                variante="secundario"
                tamano="lg"
                className="w-full sm:w-auto"
              >
                <SlidersHorizontal aria-hidden="true" className="size-5" strokeWidth={1.8} />
                Probarlo en el configurador
              </Boton>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <section aria-labelledby="titulo-para-que">
            <h2 id="titulo-para-que" className="text-2xl font-medium sm:text-3xl">
              Para qué sirve
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-tinta/80">{componente.descripcion}</p>
          </section>
          <section aria-labelledby="titulo-datos">
            <h2 id="titulo-datos" className="text-2xl font-medium sm:text-3xl">
              Datos técnicos
            </h2>
            <dl className="mt-4 divide-y divide-linea border-y border-linea">
              {fichaTecnica(componente).map((dato) => (
                <div key={dato.nombre} className="flex justify-between gap-4 py-3">
                  <dt className="text-gris">{dato.nombre}</dt>
                  <dd className="text-right font-medium">{dato.valor}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {componente.kits.length > 0 && (
          <section aria-labelledby="titulo-en-kits" className="mt-20">
            <h2 id="titulo-en-kits" className="text-2xl font-medium sm:text-3xl">
              Viene en estos kits
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {componente.kits.map((kit) => (
                <li key={kit.slug}>
                  <Link
                    href={`/kits/${kit.slug}`}
                    className="flex h-full flex-col rounded-tarjeta bg-niebla p-5 transition-colors hover:bg-linea/60"
                  >
                    <Image
                      src={kit.imagen}
                      alt=""
                      width={400}
                      height={300}
                      unoptimized
                      className="h-auto w-full"
                    />
                    <span className="mt-3 font-medium">
                      {kit.cantidad > 1 && <span className="text-acento">{kit.cantidad} × </span>}
                      {kit.nombre}
                    </span>
                    <span className="mt-1 text-sm text-gris">{kit.eslogan}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {guias.length > 0 && (
          <div className="mt-20">
            <GuiasRelacionadas guias={guias} />
          </div>
        )}

        {parecidos.length > 0 && (
          <section aria-labelledby="titulo-parecidos" className="mt-20">
            <h2 id="titulo-parecidos" className="text-2xl font-medium sm:text-3xl">
              Más {nombreCategoria(componente.categoria).toLowerCase()}
            </h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {parecidos.map((c) => (
                <li key={c.slug} className="flex">
                  <TarjetaComponente componente={c} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </Contenedor>
    </>
  );
}
