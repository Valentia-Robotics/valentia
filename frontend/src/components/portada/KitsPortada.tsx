import Image from "next/image";
import Link from "next/link";
import { FormularioAvisame } from "@/components/espera/FormularioAvisame";
import { FotoKitViaje } from "@/components/tienda/FotoKitViaje";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { textoTienda } from "@/config/stock";
import { tienda } from "@/config/tienda";
import { listaDeTextos, type KitResumen } from "@/lib/catalogo";
import { formatearPrecio } from "@/lib/utils";
import { cuantosKits, enLaCaja, queHace } from "./datosKit";
import { Etiqueta } from "./Etiqueta";
import { GaleriaKits } from "./GaleriaKits";

/**
 * LOS KITS EN LA PORTADA (Jesse, 12-11-2026: «sin frases genéricas»). Nada de eslóganes: cada
 * kit dice qué hace, qué trae la caja, para qué edad es y cuánto se tarda en montar, todo de la BD.
 *   1. Titular con el número real de kits y el dato que más pregunta la gente (no hay que soldar).
 *   2. El kit destacado como una hoja de datos: foto, qué hace, datos, lo que trae la caja y el
 *      precio. Con la tienda cerrada, el «Avísame» va AQUÍ, junto al precio (antes era un recuadro
 *      aparte encima de la sección: AvisoApertura, ya borrado).
 *   3. Los demás kits en tarjetas con los mismos datos en corto (GaleriaKits).
 */
export function KitsPortada({
  estrella,
  kits,
  compraAbierta,
}: {
  estrella: KitResumen | undefined;
  kits: KitResumen[];
  compraAbierta: boolean;
}) {
  const total = kits.length + (estrella ? 1 : 0);
  if (total === 0) return null;

  return (
    <section
      id="kits"
      aria-labelledby="titulo-kits"
      className="overflow-x-clip bg-white pt-14 pb-20 sm:pt-20 sm:pb-28"
    >
      <Contenedor>
        <div className="aparecer grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Etiqueta>Los kits</Etiqueta>
            <h2
              id="titulo-kits"
              className="titular-cartel mt-5 max-w-3xl text-5xl font-medium sm:text-6xl"
            >
              {cuantosKits(total, true)} para montar en casa, sin soldar.
            </h2>
          </div>
          <p className="max-w-md font-serif text-lg leading-snug text-tinta/80 lg:justify-self-end">
            Las piezas se enchufan, encajan o se unen con imanes. Cada caja trae todo lo necesario,
            también las baterías y el cable USB, y un curso en vídeo que explica el montaje y la
            programación paso a paso.
          </p>
        </div>

        {estrella && <FichaDestacada kit={estrella} compraAbierta={compraAbierta} />}

        {kits.length > 0 && (
          <div className="aparecer mt-16 sm:mt-20">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-dotted border-tinta/25 pb-4">
              <h3 className="text-2xl font-medium sm:text-3xl">
                {estrella ? `Los otros ${cuantosKits(kits.length)}` : "Todos los kits"}
              </h3>
              <Link
                href="/kits"
                className="font-mono text-xs text-tinta/70 underline-offset-4 hover:text-acento hover:underline"
              >
                Comparar todos los kits →
              </Link>
            </div>
            <div className="mt-6">
              <GaleriaKits
                kits={kits.map((k) => ({
                  slug: k.slug,
                  nombre: k.nombre,
                  imagen: k.imagen,
                  nivel: k.nivel,
                  edadMinima: k.edadMinima,
                  montaje: k.tiempoMontaje,
                  hace: queHace(listaDeTextos(k.puntosFuertes)).slice(0, 3),
                  precio: formatearPrecio(k.precioCentimos),
                  lecciones: k.curso._count.lecciones,
                }))}
              />
            </div>
          </div>
        )}
      </Contenedor>
    </section>
  );
}

/** El kit destacado como hoja de datos: foto + qué hace + datos, la caja abajo y el pie de compra */
function FichaDestacada({ kit, compraAbierta }: { kit: KitResumen; compraAbierta: boolean }) {
  const hace = queHace(listaDeTextos(kit.puntosFuertes));
  const caja = enLaCaja(kit.componentes);
  const lecciones = kit.curso._count.lecciones;
  const envioGratis = kit.precioCentimos >= tienda.envio.gratisDesdeCentimos;

  const datos: [string, string][] = [
    ["Edad", `Desde ${kit.edadMinima} años`],
    ["Nivel", kit.nivel],
    ["Montaje", `${kit.tiempoMontaje}, sin soldar`],
    ["Curso", `${lecciones} ${lecciones === 1 ? "lección" : "lecciones"} en vídeo`],
  ];

  return (
    <article
      aria-labelledby="titulo-kit-destacado"
      className="aparecer mt-12 overflow-hidden rounded-tarjeta bg-white ring-1 ring-tinta/15 sm:mt-14"
    >
      <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Foto: sobre niebla, con la referencia del kit en letra de máquina */}
        <div className="relative flex items-center justify-center bg-niebla p-6 sm:p-10">
          <p className="absolute top-4 left-4 font-mono text-[11px] text-tinta/55 sm:top-5 sm:left-6">
            {kit.nivel} · desde {kit.edadMinima} años
          </p>
          <FotoKitViaje slug={kit.slug}>
            <Image
              src={kit.imagen}
              alt={`Foto del kit ${kit.nombre} montado`}
              width={800}
              height={600}
              unoptimized
              className="mx-auto mt-6 h-auto max-h-[min(48dvh,460px)] w-auto max-w-full"
            />
          </FotoKitViaje>
        </div>

        <div className="flex flex-col p-6 sm:p-8 lg:border-l lg:border-dotted lg:border-tinta/25">
          <h3 id="titulo-kit-destacado" className="titular-cartel text-3xl font-medium sm:text-4xl">
            {kit.nombre}
          </h3>

          {hace.length > 0 && (
            <>
              <p className="mt-6 font-mono text-xs text-tinta/60">Qué hace</p>
              <ul className="mt-2 space-y-2">
                {hace.map((texto) => (
                  <li key={texto} className="flex gap-3 text-base leading-snug">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-acento" />
                    {texto}
                  </li>
                ))}
              </ul>
            </>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-recto bg-tinta/10 text-sm">
            {datos.map(([nombre, valor]) => (
              <div key={nombre} className="bg-salvia px-3 py-2.5">
                <dt className="font-mono text-[11px] text-tinta/60">{nombre}</dt>
                <dd className="mt-0.5 font-medium">{valor}</dd>
              </div>
            ))}
          </dl>

          {/* Precio y qué se puede hacer ahora mismo (comprar o apuntarse) */}
          <div className="mt-8 border-t border-dotted border-tinta/25 pt-6 lg:mt-auto">
            <div>
              <p className="text-4xl font-medium tabular-nums">
                {formatearPrecio(kit.precioCentimos)}
              </p>
              <p className="mt-1 text-sm text-gris">
                IVA incluido
                {envioGratis && ` · envío gratis a la ${tienda.envio.nombreZona}`}
              </p>
            </div>

            {compraAbierta ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <Boton href={`/kits/${kit.slug}#comprar`} variante="bloque" tamano="lg">
                  {kit.stock > 0 ? "Comprar" : `${textoTienda(0, kit.enReposicion)} · Avísame`}
                </Boton>
                <Boton href={`/kits/${kit.slug}`} variante="punteado" tamano="lg">
                  Ver la ficha completa
                </Boton>
              </div>
            ) : (
              <div className="mt-5">
                <p className="text-sm">
                  <strong className="font-semibold">Aún no vendemos online.</strong> Deja tu email y
                  te mandamos un solo correo el día que abra la tienda.
                </p>
                <FormularioAvisame origen="portada" kitSlug={kit.slug} className="mt-3" />
                <Link
                  href={`/kits/${kit.slug}`}
                  className="mt-3 inline-block font-mono text-xs text-tinta/70 underline-offset-4 hover:text-acento hover:underline"
                >
                  Ver la ficha completa del kit →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lo que trae la caja, de la lista de piezas del kit */}
      <div className="border-t border-dotted border-tinta/25 px-6 py-6 sm:px-8">
        <p className="font-mono text-xs text-tinta/60">En la caja · {caja.length} cosas</p>
        <ul className="mt-3 grid gap-x-8 gap-y-1.5 text-sm text-tinta/85 sm:grid-cols-2 lg:grid-cols-3">
          {caja.map((texto) => (
            <li key={texto} className="flex gap-2.5">
              <span aria-hidden="true" className="font-mono text-tinta/40">
                —
              </span>
              {texto}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
