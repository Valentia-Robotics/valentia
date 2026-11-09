import Image from "next/image";
import { FotoKitViaje } from "@/components/tienda/FotoKitViaje";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import type { KitResumen } from "@/lib/catalogo";
import { formatearPrecio } from "@/lib/utils";
import { Etiqueta } from "./Etiqueta";
import { TablaKits } from "./TablaKits";

/**
 * LOS KITS EN LA PORTADA: primero el destacado, grande (su foto «viaja» a la ficha), y después
 * todos en una tabla para compararlos de un vistazo.
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
  return (
    <section aria-labelledby="titulo-kits" className="overflow-x-clip bg-white pt-8 pb-20 sm:pb-28">
      <Contenedor>
        <div className="aparecer">
          <Etiqueta>Elige tu kit</Etiqueta>
          <h2
            id="titulo-kits"
            className="titular-cartel mt-5 max-w-3xl text-5xl font-medium sm:text-7xl"
          >
            Un robot para cada curiosidad.
          </h2>
        </div>

        {estrella && (
          <div className="mt-14 grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="aparecer order-2 lg:order-1">
              <p className="font-mono text-xs text-tinta/60">
                ● El kit destacado · {estrella.nivel} · desde {estrella.edadMinima} años
              </p>
              <h3 className="titular-cartel mt-3 text-4xl font-medium sm:text-5xl">
                {estrella.nombre}
              </h3>
              <p className="mt-4 max-w-md font-serif text-xl leading-snug">{estrella.eslogan}</p>
              <p className="mt-4 text-sm text-gris">
                {formatearPrecio(estrella.precioCentimos)} · Curso de{" "}
                {estrella.curso._count.lecciones} lecciones incluido
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Boton href={`/kits/${estrella.slug}#comprar`} variante="bloque" tamano="lg">
                  {/* Con la tienda cerrada, la ficha enseña ahí el «Avísame» */}
                  {compraAbierta ? "Comprar" : "Avísame cuando abra"}
                </Boton>
                <Boton href={`/kits/${estrella.slug}`} variante="punteado" tamano="lg">
                  Ver el kit
                </Boton>
              </div>
            </div>
            <div className="acercar relative order-1 rounded-recto bg-niebla p-6 lg:order-2">
              <span
                aria-hidden="true"
                className="absolute top-4 left-4 font-mono text-[0.7rem] text-tinta/70"
              >
                fig. 01 — {estrella.slug}
              </span>
              <FotoKitViaje slug={estrella.slug}>
                <Image
                  src={estrella.imagen}
                  alt={`Foto del kit ${estrella.nombre} montado`}
                  width={800}
                  height={600}
                  unoptimized
                  className="mx-auto h-auto max-h-[min(52dvh,520px)] w-auto max-w-full"
                />
              </FotoKitViaje>
            </div>
          </div>
        )}

        {kits.length > 0 && (
          <div className="aparecer mt-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h3 className="text-2xl font-medium sm:text-3xl">Compáralos</h3>
              <p className="max-w-sm font-serif text-base leading-snug text-tinta/80">
                Todos llevan las piezas, el cable y un curso en vídeo hecho para ellos.
              </p>
            </div>
            <div className="mt-6">
              <TablaKits
                kits={kits.map((k) => ({
                  slug: k.slug,
                  nombre: k.nombre,
                  eslogan: k.eslogan,
                  imagen: k.imagen,
                  nivel: k.nivel,
                  edadMinima: k.edadMinima,
                  tiempoMontaje: k.tiempoMontaje,
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
