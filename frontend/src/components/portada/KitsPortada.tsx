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
import { CabeceraChip } from "./CabeceraChip";
import { cuantosKits, enLaCaja, queHace } from "./datosKit";
import { Etiqueta } from "./Etiqueta";
import { GaleriaKits } from "./GaleriaKits";

/**
 * LOS KITS EN LA PORTADA, SOBRE LA PLACA VERDE (Jesse, 12-11-2026: «la misma interfaz verde con
 * chips, bien repartido, más organizado y más limpio», y sin frases genéricas).
 * La sección es una placa perforada (.placa-rejilla) y cada kit, un chip blanco montado encima:
 * cabecera negra con su referencia (U1, U2…), patas plateadas a los lados (.chip-patas) y sombra cobre.
 * Pensado como cliente, en el orden en que se lo pregunta:
 *   1. ¿Qué es esto? Titular con el número real de kits + qué trae cada caja.
 *   2. ¿Puedo comprar ya? Mientras la tienda no cobra, UNA franja con el «Avísame» (antes un recuadro aparte).
 *   3. ¿Es para mí y cuánto cuesta? El destacado: foto, qué hace, edad, nivel, montaje, curso y precio
 *      juntos; lo que trae la caja, plegado (está, pero no llena la tarjeta). Un solo botón claro.
 *   4. ¿Hay otros? Los demás kits en chips iguales, con los mismos datos en el mismo sitio para comparar.
 * Todos los datos salen de la BD (lo que se cambie en el panel sale aquí solo).
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
      className="placa-rejilla relative isolate overflow-x-clip pt-16 pb-20 text-white sm:pt-20 sm:pb-28"
    >
      {/* Línea de cobre arriba: separa esta placa de la del titular */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-cobre/60" />

      <Contenedor>
        <div className="aparecer grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Etiqueta oscura>Los kits</Etiqueta>
            <h2
              id="titulo-kits"
              className="titular-cartel mt-5 max-w-3xl text-5xl font-medium sm:text-6xl"
            >
              {cuantosKits(total, true)} para montar en casa, sin soldar.
            </h2>
          </div>
          <p className="max-w-md font-serif text-lg leading-snug text-white/85 lg:justify-self-end">
            Las piezas se enchufan, encajan o se unen con imanes. Cada caja trae todo lo necesario,
            también las baterías y el cable USB, y un curso en vídeo con el montaje y la
            programación paso a paso.
          </p>
        </div>

        {!compraAbierta && (
          <div className="mt-10 grid gap-4 border-y border-dashed border-white/25 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center lg:gap-10">
            <p className="text-base">
              <span className="mr-2 inline-block size-2 bg-senal align-middle" aria-hidden="true" />
              <strong className="font-semibold">Aún no vendemos online.</strong>{" "}
              <span className="text-white/80">
                Deja tu email y te mandamos un solo correo el día que abra la tienda.
              </span>
            </p>
            <FormularioAvisame origen="portada" oscuro />
          </div>
        )}

        {estrella && <ChipDestacado kit={estrella} compraAbierta={compraAbierta} />}

        {kits.length > 0 && (
          <div className="aparecer mt-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-2xl font-medium sm:text-3xl">
                {estrella ? `Los otros ${cuantosKits(kits.length)}` : "Todos los kits"}
              </h3>
              <Link
                href="/kits"
                className="font-mono text-xs text-white/75 underline-offset-4 hover:text-white hover:underline"
              >
                Comparar todos los kits →
              </Link>
            </div>
            <div className="mt-6">
              <GaleriaKits
                primeraReferencia={estrella ? 2 : 1}
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

/** El kit destacado: un chip grande con la foto a un lado y sus datos al otro */
function ChipDestacado({ kit, compraAbierta }: { kit: KitResumen; compraAbierta: boolean }) {
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
      className="chip-patas aparecer mt-12 rounded-recto bg-white text-tinta shadow-[0_8px_0_var(--color-cobre)]"
    >
      <div className="overflow-hidden rounded-recto">
        <CabeceraChip referencia={1} nivel={kit.nivel} edadMinima={kit.edadMinima} />

        <div className="grid lg:grid-cols-2">
          <div className="flex items-center justify-center bg-niebla p-6 sm:p-10">
            <FotoKitViaje slug={kit.slug}>
              <Image
                src={kit.imagen}
                alt={`Foto del kit ${kit.nombre} montado`}
                width={800}
                height={600}
                unoptimized
                className="mx-auto h-auto max-h-[min(44dvh,420px)] w-auto max-w-full"
              />
            </FotoKitViaje>
          </div>

          <div className="flex flex-col p-6 sm:p-8">
            <h3
              id="titulo-kit-destacado"
              className="titular-cartel text-3xl font-medium sm:text-4xl"
            >
              {kit.nombre}
            </h3>

            {hace.length > 0 && (
              <ul className="mt-5 space-y-2">
                {hace.map((texto) => (
                  <li key={texto} className="flex gap-3 text-base leading-snug">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-placa" />
                    {texto}
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-2 text-sm">
              {datos.map(([nombre, valor]) => (
                <div key={nombre} className="rounded-recto bg-salvia px-3 py-2.5">
                  <dt className="font-mono text-[11px] text-tinta/60">{nombre}</dt>
                  <dd className="mt-0.5 font-medium">{valor}</dd>
                </div>
              ))}
            </dl>

            {/* Lo que trae la caja, plegado: está, pero no llena la tarjeta */}
            <details className="group mt-4 rounded-recto border border-dotted border-tinta/30">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                Qué trae la caja ({caja.length} cosas)
                <span
                  aria-hidden="true"
                  className="font-mono text-tinta/60 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <ul className="space-y-1 border-t border-dotted border-tinta/30 px-3 py-3 text-sm text-tinta/85">
                {caja.map((texto) => (
                  <li key={texto} className="flex gap-2.5">
                    <span aria-hidden="true" className="text-tinta/40">
                      —
                    </span>
                    {texto}
                  </li>
                ))}
              </ul>
            </details>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-dotted border-tinta/25 pt-5 lg:mt-auto">
              <div>
                <p className="text-3xl font-medium tabular-nums">
                  {formatearPrecio(kit.precioCentimos)}
                </p>
                <p className="mt-0.5 text-xs text-gris">
                  IVA incluido
                  {envioGratis && ` · envío gratis a la ${tienda.envio.nombreZona}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {compraAbierta && (
                  <Boton href={`/kits/${kit.slug}#comprar`} variante="bloque">
                    {kit.stock > 0 ? "Comprar" : `${textoTienda(0, kit.enReposicion)} · Avísame`}
                  </Boton>
                )}
                <Boton href={`/kits/${kit.slug}`} variante={compraAbierta ? "punteado" : "bloque"}>
                  Ver el kit
                </Boton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
