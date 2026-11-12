import Image from "next/image";
import Link from "next/link";
import { FotoKitViaje } from "@/components/tienda/FotoKitViaje";
import { Contenedor } from "@/components/ui/Contenedor";
import type { KitResumen } from "@/lib/catalogo";
import { formatearPrecio } from "@/lib/utils";

/**
 * LOS KITS EN LA PORTADA: una tarjeta grande por kit, todas iguales (foto, nombre, para quién y precio).
 * Sin destacado ni tabla: se entiende de un vistazo que hay que elegir uno. Toda la tarjeta es un
 * enlace a su ficha y la foto «viaja» hasta ella (FotoKitViaje).
 */
export function KitsPortada({ kits }: { kits: KitResumen[] }) {
  if (kits.length === 0) return null;

  return (
    <section
      id="kits"
      aria-labelledby="titulo-kits"
      className="scroll-mt-nav bg-white py-20 sm:py-28"
    >
      <Contenedor>
        <div className="aparecer max-w-2xl">
          <h2 id="titulo-kits" className="titular-cartel text-4xl font-medium sm:text-6xl">
            Elige tu robot.
          </h2>
          <p className="mt-4 text-lg text-tinta/70 sm:text-xl">
            En la caja va todo: piezas, baterías, cable y su curso.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 sm:mt-14 md:grid-cols-3">
          {kits.map((kit) => (
            <li key={kit.slug} className="aparecer">
              <Link
                href={`/kits/${kit.slug}`}
                className="group flex h-full flex-col rounded-tarjeta bg-estudio p-3 transition-[box-shadow,translate] duration-500 hover:-translate-y-1 hover:shadow-posada"
              >
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.1rem] bg-white">
                  <FotoKitViaje slug={kit.slug}>
                    <Image
                      src={kit.imagen}
                      alt={`${kit.nombre}, montado`}
                      width={800}
                      height={600}
                      unoptimized
                      className="h-auto w-full transition-[scale] duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  </FotoKitViaje>
                </div>
                <div className="flex flex-1 flex-col px-3 pt-5 pb-3">
                  <h3 className="text-xl leading-snug font-medium text-pretty sm:text-[1.35rem]">
                    {kit.nombre}
                  </h3>
                  <p className="mt-2 text-base text-gris">
                    Desde {kit.edadMinima} años · {kit.nivel}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-6">
                    <span className="text-xl font-medium tabular-nums">
                      {formatearPrecio(kit.precioCentimos)}
                    </span>
                    <span className="inline-flex h-10 items-center rounded-full bg-tinta px-5 text-sm font-medium text-white transition-colors group-hover:bg-acento">
                      Ver kit
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Contenedor>
    </section>
  );
}
