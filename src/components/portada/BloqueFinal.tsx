import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { tienda } from "@/config/tienda";
import { formatearPrecio } from "@/lib/utils";

/** Último bloque de la portada: una invitación final a empezar. */
export function BloqueFinal() {
  return (
    <section aria-labelledby="titulo-final" className="bg-tinta py-24 text-white sm:py-32">
      <Contenedor className="aparecer text-center">
        <h2 id="titulo-final" className="text-4xl font-medium sm:text-6xl">
          Tu primer robot te está esperando.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gris-claro">
          Envío a toda la {tienda.envio.nombreZona} en {tienda.envio.plazo}. Gratis a partir de{" "}
          {formatearPrecio(tienda.envio.gratisDesdeCentimos)}.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Boton href="/kits" variante="claro" tamano="lg">
            Elegir mi kit
          </Boton>
          <Boton href="/configurador" variante="enlace-claro" tamano="lg">
            O créalo pieza a pieza ›
          </Boton>
        </div>
      </Contenedor>
    </section>
  );
}
