import { FormularioAvisame } from "@/components/espera/FormularioAvisame";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { tienda } from "@/config/tienda";
import { formatearPrecio } from "@/lib/utils";
import { CampoPixeles } from "./CampoPixeles";

/**
 * Último bloque de la portada: una invitación final a empezar, sobre negro con los mismos píxeles
 * vivos que la primera pantalla (la página empieza y acaba igual).
 * Mientras la tienda no cobra, en su lugar se pide el email para avisar el día que abra.
 */
export function BloqueFinal({ compraAbierta }: { compraAbierta: boolean }) {
  if (!compraAbierta) {
    return (
      <section
        id="avisame"
        aria-labelledby="titulo-final"
        className="relative isolate scroll-mt-nav overflow-hidden bg-tinta pt-20 pb-28 text-white sm:pt-28 sm:pb-36"
      >
        <CampoPixeles variante="final" />
        <Contenedor className="aparecer relative max-w-2xl text-center">
          <h2 id="titulo-final" className="titular-cartel text-5xl font-medium sm:text-8xl">
            Abrimos muy pronto.
          </h2>
          <p className="mx-auto mt-6 max-w-xl font-serif text-xl leading-snug text-white/75">
            Estamos montando las primeras cajas y probando cada robot antes de que salga de casa. Si
            quieres, te mandamos un correo el día que se pueda comprar. Uno, nada más.
          </p>
          <FormularioAvisame origen="portada" oscuro className="mx-auto mt-8 max-w-md text-left" />
        </Contenedor>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="titulo-final"
      className="relative isolate overflow-hidden bg-tinta pt-20 pb-28 text-white sm:pt-28 sm:pb-36"
    >
      <CampoPixeles variante="final" />
      <Contenedor className="aparecer relative text-center">
        <h2 id="titulo-final" className="titular-cartel text-5xl font-medium sm:text-8xl">
          ¿Te animas?
        </h2>
        <p className="mx-auto mt-6 max-w-xl font-serif text-xl leading-snug text-white/75">
          Envío a toda la {tienda.envio.nombreZona} en {tienda.envio.plazo}. Gratis a partir de{" "}
          {formatearPrecio(tienda.envio.gratisDesdeCentimos)}.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Boton href="/kits" variante="claro" tamano="lg" className="rounded-recto!">
            Elegir mi kit
          </Boton>
          <Boton href="/configurador" variante="enlace-claro" tamano="lg">
            O elige tú las piezas ›
          </Boton>
        </div>
      </Contenedor>
    </section>
  );
}
