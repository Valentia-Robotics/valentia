import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioAvisame } from "@/components/espera/FormularioAvisame";
import { BotonAnadirCarrito } from "@/components/tienda/BotonAnadirCarrito";
import { BotonKitGratis } from "@/components/tienda/BotonKitGratis";
import { FotoKitViaje } from "@/components/tienda/FotoKitViaje";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { Estrellas } from "@/components/resenas/Estrellas";
import { SeccionResenas } from "@/components/resenas/SeccionResenas";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { GuiasRelacionadas } from "@/components/guias/GuiasRelacionadas";
import { guiasRelacionadas } from "@/config/guias";
import { listaDeTextos, obtenerKitPorSlug, obtenerKits, piezasDeKit } from "@/lib/catalogo";
import { datosKit, datosMigas } from "@/lib/datosEstructurados";
import { compraAbierta } from "@/lib/pagos";
import { resenasDelKit } from "@/lib/resenas";
import { conseguirKitGratis } from "./acciones";
import { formatearMedia } from "@/lib/resenas/formato";
import { FotoOModelo } from "@/components/tienda/FotoOModelo";
import { modeloDeKit } from "@/lib/modelos3d";
import { formatearNumero, precioDeKit } from "@/lib/utils";
import { textoTienda } from "@/config/stock";
import { EsquemaBloques } from "@/components/configurador/EsquemaBloques";
import { Lectura } from "@/components/configurador/Lectura";
import { Led } from "@/components/ui/Led";
import { Cruces, MarcoCAD } from "@/components/ui/MarcoCAD";
import { resumenTecnico } from "@/lib/resumenTecnico";

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
        : `${kit.eslogan} Lista de materiales, esquema de bloques, consumo y GPIO, y curso de firmware en C++. Desde ${kit.edadMinima} años.`,
    ruta: `/kits/${kit.slug}`,
  });
}

/** Título de sección en mono: «// SEC_02 · Lista de materiales» */
function Seccion({ codigo, children, id }: { codigo: string; children: React.ReactNode; id: string }) {
  return (
    <div className="aparecer">
      <p className="mono-etiqueta text-gris">
        <span className="text-acento">{"// "}</span>
        {codigo}
      </p>
      <h2 id={id} className="titular-cartel mt-3 text-3xl font-semibold sm:text-5xl">
        {children}
      </h2>
    </div>
  );
}

/**
 * FICHA DE KIT como hoja técnica: vista 3D + cajetín de compra, descripción, lista de materiales,
 * esquema de bloques con sus lecturas y temario del curso. Todo sale de la BD.
 */
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
  const piezas = piezasDeKit(kit);
  const totalPiezas = piezas.reduce((total, p) => total + p.cantidad, 0);
  const r = resumenTecnico(piezas);
  const estado = textoTienda(kit.stock, kit.enReposicion);
  const matriz: [string, string][] = gratis
    ? [
        ["Contenido", "Curso digital"],
        ["Lecciones", `${lecciones.length} · ${minutosCurso} min`],
      ]
    : [
        ["MCU", r.mcu ?? "—"],
        ["Lógica", r.logica ? `${formatearNumero(r.logica)} V` : "—"],
        ["Actuadores", r.actuadores ?? "—"],
        ["Sensores", r.sensores ? `${r.sensores} canales` : "—"],
        ["Edad mín.", `${kit.edadMinima} años`],
        ["Montaje", kit.tiempoMontaje],
      ];

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

      {/* ---------- Cabecera: vista 3D + cajetín de compra ---------- */}
      <section id="comprar" className="rejilla-plano scroll-mt-nav border-b border-linea">
        <Contenedor className="pt-6 pb-12 sm:pb-16">
          <Link
            href="/kits"
            className="mono-etiqueta text-gris transition-colors duration-100 hover:text-tinta"
          >
            ← Kits
          </Link>

          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
            <MarcoCAD
              etiqueta={gratis ? "Vista" : "Vista 3D · arrastra para girar"}
              cota={`REF · ${kit.slug.toUpperCase()}`}
              className="llegar bg-panel"
            >
              {/* El kit en 3D (se gira con el dedo o el ratón) si tiene modelo; si no, su foto */}
              <FotoOModelo
                modelo={gratis ? null : modeloDeKit(kit.slug)}
                nombre={kit.nombre}
                foto={
                  <div className="rejilla-plano-fina p-6 sm:p-10">
                    <FotoKitViaje slug={kit.slug}>
                      <Image
                        src={kit.imagen}
                        alt={gratis ? kit.nombre : `Foto del kit ${kit.nombre} montado`}
                        width={800}
                        height={600}
                        priority
                        unoptimized
                        className="mx-auto h-auto w-full"
                      />
                    </FotoKitViaje>
                  </div>
                }
              />
            </MarcoCAD>

            <div className="llegar" style={{ "--i": 1 } as React.CSSProperties}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="mono-etiqueta text-gris">
                  {kit.nivel}
                  {!gratis && ` · ${totalPiezas} piezas`} · {lecciones.length}{" "}
                  {lecciones.length === 1 ? "lección" : "lecciones"}
                </p>
                {!gratis && (
                  <Led
                    estado={estado === "En stock" ? "ok" : estado === "En reposición" ? "aviso" : "apagado"}
                    texto={abierta ? estado : "Preventa"}
                  />
                )}
              </div>
              <h1 className="titular-cartel mt-3 text-4xl font-semibold sm:text-5xl">{kit.nombre}</h1>
              <p className="mt-4 text-[15px] leading-relaxed text-gris">{kit.eslogan}</p>
              {resenas.total > 0 && (
                <a
                  href="#opiniones"
                  className="mt-3 inline-flex items-center gap-2 font-mono text-[12px] text-gris hover:text-tinta"
                >
                  <Estrellas nota={resenas.media} className="text-base" />
                  {formatearMedia(resenas.media)} · {resenas.total}{" "}
                  {resenas.total === 1 ? "opinión" : "opiniones"}
                </a>
              )}

              <dl className="mt-6 grid grid-cols-2 border-t border-l border-linea font-mono text-[12px]">
                {matriz.map(([nombre, valor]) => (
                  <div key={nombre} className="border-r border-b border-linea px-3 py-2.5">
                    <dt className="mono-etiqueta text-[10px] text-gris">{nombre}</dt>
                    <dd className="mt-0.5 text-tinta">{valor}</dd>
                  </div>
                ))}
              </dl>

              {/* Proximidad (Gestalt): el precio va pegado a lo que se hace con él */}
              <div className="relative mt-6 border border-linea bg-carbon p-5 sm:p-6">
                <Cruces />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-3xl text-tinta tabular-nums">
                    {precioDeKit(kit.precioCentimos)}
                  </p>
                  <p className="mono-etiqueta text-gris">
                    {gratis ? "Sin pago · activación inmediata" : "PVP · IVA incl."}
                  </p>
                </div>

                {gratis ? (
                  <form action={conseguirKitGratis.bind(null, kit.slug)} className="mt-5">
                    <BotonKitGratis />
                  </form>
                ) : abierta && kit.stock === 0 ? (
                  // Sin unidades en el almacén (se cuentan en /stock): no se puede comprar, pero sí pedir aviso
                  <div className="mt-5 border-t border-linea pt-5">
                    <p className="mono-etiqueta text-tinta">{textoTienda(0, kit.enReposicion)}</p>
                    <p className="mt-1.5 text-sm text-gris">
                      {kit.enReposicion
                        ? "Unidades agotadas; el siguiente lote ya está en producción."
                        : "Sin unidades en almacén."}{" "}
                      Te avisamos por correo cuando vuelva a haber.
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
                      Abrir en el configurador
                    </Boton>
                  </div>
                ) : (
                  <div className="mt-5 border-t border-linea pt-5">
                    <Led estado="aviso" parpadeo texto="Preventa · lista de espera abierta" />
                    <p className="mt-2 text-sm text-gris">
                      Un único correo el día que se abra la venta.
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
      <section aria-labelledby="titulo-descripcion" className="py-16 sm:py-24">
        <Contenedor className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Seccion codigo="SEC_01 · Descripción" id="titulo-descripcion">
            {gratis ? "Contenido del curso." : "Qué hace este kit."}
          </Seccion>
          <div className="aparecer">
            <p className="text-[15px] leading-relaxed text-gris">{kit.descripcion}</p>
            {puntosFuertes.length > 0 && (
              <ol className="mt-6 border-t border-linea">
                {puntosFuertes.map((punto, i) => (
                  <li key={punto} className="flex gap-4 border-b border-linea py-2.5 text-[15px]">
                    <span className="font-mono text-[12px] text-acento">{String(i + 1).padStart(2, "0")}</span>
                    <span>{punto}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Contenedor>
      </section>

      {/* ---------- Lista de materiales ---------- */}
      {piezas.length > 0 && (
        <section aria-labelledby="titulo-caja" className="border-t border-linea py-16 sm:py-24">
          <Contenedor>
            <Seccion codigo="SEC_02 · Lista de materiales" id="titulo-caja">
              {totalPiezas} piezas. Ninguna soldadura.
            </Seccion>
            <div className="aparecer mt-10 overflow-x-auto border border-linea">
              <table className="w-full min-w-[40rem] border-collapse font-mono text-[12px]">
                <thead>
                  <tr className="border-b border-linea bg-panel text-left">
                    {["", "Componente", "Cant.", "Tensión", "Consumo", "GPIO"].map((t) => (
                      <th key={t} scope="col" className="mono-etiqueta px-3 py-2.5 font-normal text-gris">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kit.componentes.map(({ componente, cantidad }) => (
                    <tr key={componente.id} className="border-b border-linea last:border-b-0">
                      <td className="w-16 px-3 py-2">
                        <Image
                          src={componente.imagen}
                          alt=""
                          width={96}
                          height={72}
                          unoptimized
                          className="h-auto w-12 bg-panel"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {componente.visible ? (
                          <Link
                            href={`/componentes/${componente.slug}`}
                            className="text-tinta underline decoration-linea underline-offset-4 transition-colors duration-100 hover:decoration-acento"
                          >
                            {componente.nombre}
                          </Link>
                        ) : (
                          <span className="text-tinta">{componente.nombre}</span>
                        )}
                        <span className="block text-[11px] text-gris-claro">{componente.slug}</span>
                      </td>
                      <td className="px-3 py-2 text-tinta tabular-nums">×{cantidad}</td>
                      <td className="px-3 py-2 text-gris tabular-nums">
                        {componente.voltaje ? `${formatearNumero(componente.voltaje)} V` : "—"}
                      </td>
                      <td className="px-3 py-2 text-gris tabular-nums">
                        {componente.consumoMa
                          ? `${formatearNumero(componente.consumoMa * (componente.tipo === "bateria" ? 1 : cantidad))} mA${componente.tipo === "bateria" ? " máx." : ""}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-gris tabular-nums">
                        {componente.pines ? componente.pines * (componente.tipo === "placa" ? 1 : cantidad) : "—"}
                        {componente.tipo === "placa" && componente.pines ? " disp." : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Contenedor>
        </section>
      )}

      {/* ---------- Esquema de bloques ---------- */}
      {piezas.length > 0 && (
        <section aria-labelledby="titulo-esquema" className="rejilla-plano border-t border-linea py-16 sm:py-24">
          <Contenedor>
            <Seccion codigo="SEC_03 · Esquema de bloques" id="titulo-esquema">
              Cómo se conecta.
            </Seccion>
            <MarcoCAD etiqueta="Bloques · buses · alimentación" className="aparecer mt-10 bg-carbon p-5 pt-7 sm:p-7 sm:pt-9">
              <EsquemaBloques piezas={piezas} />
              <div className="mt-6 grid gap-5 border-t border-linea pt-5 sm:grid-cols-2">
                {r.gpio && (
                  <Lectura
                    etiqueta="GPIO"
                    usados={r.gpio.usados}
                    disponibles={r.gpio.disponibles}
                    unidad="pines"
                    segmentos={Math.min(40, r.gpio.disponibles)}
                  />
                )}
                {r.corriente && (
                  <Lectura
                    etiqueta="Corriente pico"
                    usados={r.corriente.usados}
                    disponibles={r.corriente.disponibles}
                    unidad="mA"
                  />
                )}
              </div>
            </MarcoCAD>
          </Contenedor>
        </section>
      )}

      {/* ---------- Temario del curso ---------- */}
      <section aria-labelledby="titulo-curso" className="border-t border-linea py-16 sm:py-24">
        <Contenedor className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <Seccion codigo="SEC_04 · Curso incluido" id="titulo-curso">
              {kit.curso.titulo}
            </Seccion>
            <p className="aparecer mt-4 text-[15px] leading-relaxed text-gris">{kit.curso.descripcion}</p>
            <p className="aparecer mt-6 font-mono text-[12px] text-gris">
              {lecciones.length} {lecciones.length === 1 ? "lección" : "lecciones"} · {minutosCurso} min
              de vídeo ·{" "}
              {gratis ? "activación con un clic" : "activación con el QR de la caja"}
            </p>
          </div>

          <ol className="aparecer border-t border-linea font-mono text-[13px]">
            {lecciones.map((leccion) => (
              <li key={leccion.slug} className="flex items-baseline gap-4 border-b border-linea py-3">
                <span className="text-gris-claro">L{String(leccion.orden).padStart(2, "0")}</span>
                <span className="flex-1 font-sans text-[15px] text-tinta">{leccion.titulo}</span>
                <span className="shrink-0 text-gris tabular-nums">{leccion.duracionMin}′</span>
              </li>
            ))}
          </ol>
        </Contenedor>
      </section>

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
