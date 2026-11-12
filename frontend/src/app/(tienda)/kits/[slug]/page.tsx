import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
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
import { BotonKitGratis } from "@/components/tienda/BotonKitGratis";
import { FotoKitViaje } from "@/components/tienda/FotoKitViaje";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Fundido } from "@/components/ui/Fundido";
import { Estrellas } from "@/components/resenas/Estrellas";
import { SeccionResenas } from "@/components/resenas/SeccionResenas";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { GuiasRelacionadas } from "@/components/guias/GuiasRelacionadas";
import { guiasRelacionadas } from "@/config/guias";
import { nombreCategoria } from "@/config/categorias";
import { listaDeTextos, obtenerKitPorSlug, obtenerKits } from "@/lib/catalogo";
import { datosKit, datosMigas } from "@/lib/datosEstructurados";
import { compraAbierta } from "@/lib/pagos";
import { resenasDelKit } from "@/lib/resenas";
import { conseguirKitGratis } from "./acciones";
import { formatearMedia } from "@/lib/resenas/formato";
import { CampoPixeles } from "@/components/portada/CampoPixeles";
import { precioDeKit } from "@/lib/utils";
import { textoTienda } from "@/config/stock";

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
  // La imagen para redes la dibuja ./opengraph-image.tsx (nombre, precio y foto del kit)
  return metadatosPagina({
    titulo: kit.precioCentimos === 0 ? kit.nombre : `${kit.nombre}: kit de robótica con curso`,
    descripcion:
      kit.precioCentimos === 0
        ? `${kit.eslogan} Gratis y sin piezas: se activa al momento en tu cuenta.`
        : `${kit.eslogan} Con todas las piezas y un curso en vídeo. No hace falta saber programar. Desde ${kit.edadMinima} años.`,
    ruta: `/kits/${kit.slug}`,
  });
}

/** FICHA DE KIT: imagen, precio, descripción, componentes incluidos y temario del curso */
export default async function PaginaKit({ params }: Props) {
  const { slug } = await params;
  const kit = await obtenerKitPorSlug(slug);
  if (!kit) notFound();

  const resenas = await resenasDelKit(kit.id);
  const abierta = compraAbierta();
  // Un kit gratis es solo un curso en vídeo: sin piezas, envío, pago, reseñas ni código QR
  const gratis = kit.precioCentimos === 0;
  const puntosFuertes = listaDeTextos(kit.puntosFuertes);
  const lecciones = kit.curso.lecciones;
  const minutosCurso = lecciones.reduce((total, l) => total + l.duracionMin, 0);
  const totalPiezas = kit.componentes.reduce((total, c) => total + c.cantidad, 0);

  return (
    <>
      <DatosEstructurados datos={datosKit(kit, (abierta && kit.stock > 0) || gratis, resenas)} />
      <DatosEstructurados
        datos={datosMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Kits", ruta: "/kits" },
          { nombre: kit.nombre, ruta: `/kits/${kit.slug}` },
        ])}
      />

      {/* ---------- Cabecera: imagen + compra ---------- */}
      <section id="comprar" className="scroll-mt-nav">
        <Contenedor className="pt-6 pb-4 sm:pb-8">
          <Link
            href="/kits"
            className="inline-flex items-center gap-1 text-sm text-gris transition-colors hover:text-tinta"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Todos los kits
          </Link>

          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
            {/* La foto, sobre la placa verde (como las cabeceras de la web) */}
            <div className="relative isolate overflow-hidden rounded-tarjeta bg-placa p-6 sm:p-10">
              <CampoPixeles variante="cabecera" />
              <FotoKitViaje slug={kit.slug}>
                <Image
                  src={kit.imagen}
                  alt={gratis ? kit.nombre : `Foto del kit ${kit.nombre} montado`}
                  width={800}
                  height={600}
                  priority
                  unoptimized
                  className="relative mx-auto h-auto w-full"
                />
              </FotoKitViaje>
            </div>

            <div>
              <div className="flex flex-wrap gap-2">
                <Etiqueta tono="acento">{kit.nivel}</Etiqueta>
                <Etiqueta>+{kit.edadMinima} años</Etiqueta>
                {!gratis && (
                  <Etiqueta>
                    <Wrench aria-hidden="true" className="size-3.5" />
                    {kit.tiempoMontaje} de montaje
                  </Etiqueta>
                )}
              </div>
              <h1 className="titular-cartel mt-5 text-5xl font-medium sm:text-6xl">{kit.nombre}</h1>
              <p className="mt-4 font-serif text-xl leading-snug text-tinta/80">{kit.eslogan}</p>
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

              <ul className="mt-6 space-y-2.5">
                {puntosFuertes.map((punto) => (
                  <li key={punto} className="flex gap-3">
                    <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-exito" />
                    <span>{punto}</span>
                  </li>
                ))}
              </ul>

              {/* Proximidad (Gestalt): el precio va pegado a lo que se hace con él (comprar,
                  conseguirlo o pedir aviso), dentro de su propia zona */}
              <div className="mt-8 border-t border-dotted border-tinta/25 pt-6">
                <p className="text-3xl font-medium">{precioDeKit(kit.precioCentimos)}</p>
                <p className="mt-1 text-sm text-gris">
                  {gratis ? "Sin pago · Se activa al momento" : "IVA incluido · Con curso en vídeo"}
                </p>

                {gratis ? (
                  <form action={conseguirKitGratis.bind(null, kit.slug)} className="mt-5">
                    <BotonKitGratis />
                  </form>
                ) : abierta && kit.stock === 0 ? (
                  // Sin unidades en el almacén (se cuentan en /stock): no se puede comprar, pero sí pedir aviso
                  <div className="mt-5 rounded-tarjeta bg-niebla p-5 sm:p-6">
                    <p className="font-medium">{textoTienda(0, kit.enReposicion)}</p>
                    <p className="mt-1 text-sm text-gris">
                      {kit.enReposicion
                        ? "Se han agotado las unidades que teníamos y ya estamos preparando más."
                        : "Ahora mismo no nos quedan unidades de este kit."}{" "}
                      Déjanos tu email y te escribimos en cuanto vuelva a estar disponible.
                    </p>
                    <FormularioAvisame origen="kit" kitSlug={kit.slug} className="mt-4" />
                  </div>
                ) : abierta ? (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
                  <div className="mt-5 rounded-tarjeta bg-niebla p-5 sm:p-6">
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
          </div>
        </Contenedor>
      </section>

      {/* ---------- Descripción ---------- */}
      <Fundido desde="blanco" hasta="tinta" />
      <section aria-labelledby="titulo-descripcion" className="bg-tinta py-6 text-white sm:py-10">
        <Contenedor className="aparecer max-w-3xl text-center">
          <h2 id="titulo-descripcion" className="titular-cartel text-4xl font-medium sm:text-6xl">
            {gratis ? "Lo que vas a ver." : "Lo que vas a construir."}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gris-claro sm:text-xl">
            {kit.descripcion}
          </p>
        </Contenedor>
      </section>

      <Fundido desde="tinta" hasta={kit.componentes.length > 0 ? "blanco" : "niebla"} />

      {/* ---------- Componentes incluidos ---------- */}
      {kit.componentes.length > 0 && (
        <section aria-labelledby="titulo-caja" className="pt-6 pb-8 sm:pt-10 sm:pb-12">
          <Contenedor>
            <div className="aparecer max-w-2xl">
              <h2 id="titulo-caja" className="titular-cartel text-4xl font-medium sm:text-6xl">
                Qué hay en la caja.
              </h2>
              <p className="mt-3 text-lg text-gris">
                {totalPiezas} piezas y nada más que comprar. No hay que soldar: todo se enchufa,
                encaja o va con imanes.
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
                    alt={componente.nombre}
                    width={80}
                    height={80}
                    unoptimized
                    className="size-20 shrink-0 rounded-control bg-white p-1"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-gris">{nombreCategoria(componente.categoria)}</p>
                    <h3 className="font-sans text-base font-medium">
                      {cantidad > 1 && <span className="text-acento">{cantidad} × </span>}
                      {componente.visible ? (
                        <Link
                          href={`/componentes/${componente.slug}`}
                          className="hover:text-acento"
                        >
                          {componente.nombre}
                        </Link>
                      ) : (
                        componente.nombre
                      )}
                    </h3>
                    <p className="mt-0.5 text-sm text-gris">{componente.resumen}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Contenedor>
        </section>
      )}

      {/* ---------- Temario del curso ---------- */}
      {kit.componentes.length > 0 && <Fundido desde="blanco" hasta="niebla" corto />}
      <section aria-labelledby="titulo-curso" className="bg-niebla pt-6 pb-8 sm:pt-10 sm:pb-12">
        <Contenedor className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="aparecer">
            <p className="etiqueta-taller">Curso incluido</p>
            <h2 id="titulo-curso" className="titular-cartel mt-3 text-4xl font-medium sm:text-6xl">
              {kit.curso.titulo}
            </h2>
            <p className="mt-4 text-lg text-gris">{kit.curso.descripcion}</p>
            <p className="mt-6 flex items-center gap-2 text-sm text-gris">
              <Clock aria-hidden="true" className="size-4" />
              {lecciones.length} {lecciones.length === 1 ? "lección" : "lecciones"} · {minutosCurso}{" "}
              minutos de vídeo
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-gris">
              <QrCode aria-hidden="true" className="size-4" />
              {gratis
                ? "Se activa con un clic, sin código"
                : "Se activa con el código QR de la caja"}
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

      <Fundido desde="niebla" hasta="blanco" corto />

      {/* ---------- Opiniones de los clientes ---------- */}
      {!gratis && <SeccionResenas slug={kit.slug} resumen={resenas} />}

      {/* ---------- Guías que hablan de este kit ---------- */}
      {guiasRelacionadas("kits", kit.slug).length > 0 && (
        <Contenedor className="pb-20 sm:pb-28">
          <GuiasRelacionadas guias={guiasRelacionadas("kits", kit.slug)} />
        </Contenedor>
      )}
    </>
  );
}
