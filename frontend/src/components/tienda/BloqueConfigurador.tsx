import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Etiqueta } from "@/components/portada/Etiqueta";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { categorias } from "@/config/categorias";

/**
 * Bloque de la portada que invita a montar tu propio robot en el configurador.
 * Las categorías van como los cajones de un taller: casillas rectas que se encienden al pasar.
 */
export function BloqueConfigurador() {
  return (
    <section
      aria-labelledby="titulo-configurador"
      className="bg-grafito pt-10 pb-16 text-white diferido sm:pt-14 sm:pb-24"
    >
      <Contenedor>
        <div className="aparecer grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Etiqueta oscura>Configurador</Etiqueta>
            <h2
              id="titulo-configurador"
              className="titular-cartel mt-5 text-5xl font-medium sm:text-7xl"
            >
              O elige tú las piezas.
            </h2>
          </div>
          <p className="max-w-md font-serif text-xl leading-snug text-white/75">
            Escoge la placa, los motores y los sensores que quieras. Si dos piezas no funcionan
            juntas, el configurador te lo dice antes de que compres nada.
          </p>
        </div>

        {/* Los cajones: cada uno abre el configurador */}
        <ul className="aparecer mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-recto bg-white/10 sm:grid-cols-3">
          {categorias.map(({ id, nombre, icono: Icono }, i) => (
            <li key={id}>
              <Link
                href="/configurador"
                className="group flex h-full flex-col justify-between gap-10 bg-grafito p-5 transition-colors duration-300 hover:bg-acento sm:p-6"
              >
                <span className="flex items-start justify-between">
                  <span className="font-mono text-xs text-white/50 group-hover:text-white/80">
                    0{i + 1}
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 text-white/40 transition-[translate,color] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                  />
                </span>
                <span className="flex items-center gap-3">
                  <Icono
                    aria-hidden="true"
                    className="size-6 text-acento-claro transition-colors group-hover:text-white"
                    strokeWidth={1.5}
                  />
                  <span className="text-lg">{nombre}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Boton
          href="/configurador"
          variante="claro"
          tamano="lg"
          className="aparecer mt-10 rounded-recto!"
        >
          Abrir el configurador
        </Boton>
      </Contenedor>
    </section>
  );
}
