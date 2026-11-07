import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { categorias } from "@/config/categorias";

/** Bloque de la portada que invita a montar tu propio robot en el configurador. */
export function BloqueConfigurador() {
  return (
    <section
      aria-labelledby="titulo-configurador"
      className="bg-grafito pt-6 pb-12 text-white diferido sm:pt-10 sm:pb-16"
    >
      <Contenedor className="text-center">
        <div className="aparecer">
          <p className="text-sm font-medium tracking-wide text-acento-claro uppercase">
            Configurador
          </p>
          <h2 id="titulo-configurador" className="mt-3 text-4xl font-medium sm:text-6xl">
            Crea tu propio robot.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gris-claro sm:text-xl">
            Elige pieza a pieza, como quien pide su menú favorito. Nosotros te avisamos si algo no
            encaja, para que aciertes a la primera.
          </p>
        </div>

        {/* Vista previa de las categorías del configurador */}
        <ul className="aparecer mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
          {categorias.map(({ id, nombre, icono: Icono }) => (
            <li
              key={id}
              className="flex flex-col items-center gap-3 rounded-tarjeta bg-white/5 px-4 py-6 ring-1 ring-white/10"
            >
              <Icono aria-hidden="true" className="size-8 text-acento-claro" strokeWidth={1.5} />
              <span className="text-base">{nombre}</span>
            </li>
          ))}
        </ul>

        <Boton href="/configurador" variante="acento" tamano="xl" className="aparecer mt-12">
          Abrir el configurador
        </Boton>
      </Contenedor>
    </section>
  );
}
