import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuiasRelacionadas } from "@/components/guias/GuiasRelacionadas";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { BotonAnadirCarrito } from "@/components/tienda/BotonAnadirCarrito";
import { FotoOModelo } from "@/components/tienda/FotoOModelo";
import { TarjetaComponente } from "@/components/tienda/TarjetaComponente";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { Led } from "@/components/ui/Led";
import { Cruces, MarcoCAD } from "@/components/ui/MarcoCAD";
import { TablaDatos } from "@/components/ui/TablaDatos";
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

/** FICHA DE UN COMPONENTE como hoja técnica: vista 3D, cajetín de compra, función, especificaciones y kits */
export default async function PaginaComponente({ params }: Props) {
  const { slug } = await params;
  const componente = await obtenerComponentePorSlug(slug);
  if (!componente) notFound();

  const agotado = componente.stock === 0;
  const estado = textoTienda(componente.stock, componente.enReposicion);
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
      <section className="rejilla-plano border-b border-linea">
        <Contenedor className="pt-6 pb-12 sm:pb-16">
          <Link
            href="/componentes"
            className="mono-etiqueta text-gris transition-colors duration-100 hover:text-tinta"
          >
            ← Componentes
          </Link>

          <div className="mt-6 grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
            {/* La pieza en 3D si tiene modelo; si no, su foto */}
            <MarcoCAD
              etiqueta={componente.modelo3d ? "Vista 3D · arrastra para girar" : "Vista"}
              cota={`REF · ${componente.slug.toUpperCase()}`}
              className="llegar bg-panel"
            >
              <FotoOModelo
                modelo={componente.modelo3d}
                nombre={componente.nombre}
                foto={
                  <div className="rejilla-plano-fina p-6 sm:p-10">
                    <Image
                      src={componente.imagen}
                      alt={`Foto de ${componente.nombre}`}
                      width={480}
                      height={480}
                      priority
                      unoptimized
                      className="relative mx-auto aspect-square h-auto w-full max-w-sm"
                    />
                  </div>
                }
              />
            </MarcoCAD>

            <div className="llegar" style={{ "--i": 1 } as React.CSSProperties}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="mono-etiqueta text-gris">
                  {nombreCategoria(componente.categoria)} · {componente.tipo}
                </p>
                <Led
                  estado={estado === "En stock" ? "ok" : estado === "En reposición" ? "aviso" : "apagado"}
                  texto={estado}
                />
              </div>
              <h1 className="titular-cartel mt-3 text-4xl font-semibold sm:text-5xl">
                {componente.nombre}
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-gris">{componente.resumen}</p>

              <div className="relative mt-6 border border-linea bg-carbon p-5 sm:p-6">
                <Cruces />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-3xl text-tinta tabular-nums">
                    {formatearPrecio(componente.precioCentimos)}
                  </p>
                  <p className="mono-etiqueta text-gris">PVP · IVA incl.</p>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
                    Probar en el configurador
                  </Boton>
                </div>
              </div>
            </div>
          </div>
        </Contenedor>
      </section>

      <Contenedor className="pt-16 pb-16 sm:pb-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <section aria-labelledby="titulo-para-que">
            <p className="mono-etiqueta text-gris">
              <span className="text-acento">{"// "}</span>SEC_01 · Función
            </p>
            <h2 id="titulo-para-que" className="mt-2 text-2xl font-semibold sm:text-3xl">
              Para qué sirve
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-gris">{componente.descripcion}</p>
          </section>
          <section aria-labelledby="titulo-datos">
            <p className="mono-etiqueta text-gris">
              <span className="text-acento">{"// "}</span>SEC_02 · Especificaciones
            </p>
            <h2 id="titulo-datos" className="mt-2 text-2xl font-semibold sm:text-3xl">
              Datos técnicos
            </h2>
            <TablaDatos filas={fichaTecnica(componente)} className="mt-4" />
          </section>
        </div>

        {componente.kits.length > 0 && (
          <section aria-labelledby="titulo-en-kits" className="mt-20">
            <p className="mono-etiqueta text-gris">
              <span className="text-acento">{"// "}</span>SEC_03 · Dónde se usa
            </p>
            <h2 id="titulo-en-kits" className="mt-2 text-2xl font-semibold sm:text-3xl">
              Viene en estos kits
            </h2>
            <ul className="mt-6 grid border-t border-l border-linea sm:grid-cols-2 lg:grid-cols-3">
              {componente.kits.map((kit) => (
                <li key={kit.slug} className="border-r border-b border-linea">
                  <Link
                    href={`/kits/${kit.slug}`}
                    className="flex h-full flex-col p-5 transition-colors duration-150 hover:bg-panel"
                  >
                    <Image
                      src={kit.imagen}
                      alt={kit.nombre}
                      width={400}
                      height={300}
                      unoptimized
                      className="h-auto w-full"
                    />
                    <span className="mt-3 font-semibold">
                      {kit.cantidad > 1 && (
                        <span className="font-mono text-acento">{kit.cantidad}× </span>
                      )}
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
            <p className="mono-etiqueta text-gris">
              <span className="text-acento">{"// "}</span>SEC_04 · Alternativas
            </p>
            <h2 id="titulo-parecidos" className="mt-2 text-2xl font-semibold sm:text-3xl">
              Más {nombreCategoria(componente.categoria).toLowerCase()}
            </h2>
            <ul className="mt-6 grid border-t border-l border-linea sm:grid-cols-2 lg:grid-cols-3">
              {parecidos.map((c) => (
                <li key={c.slug} className="border-r border-b border-linea">
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
