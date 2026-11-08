import { FormularioAvisame } from "@/components/espera/FormularioAvisame";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { tienda } from "@/config/tienda";
import { formatearPrecio } from "@/lib/utils";

/**
 * Último bloque de la portada: una invitación final a empezar.
 * Mientras la tienda no cobra, en su lugar se pide el email para avisar el día que abra.
 */
export function BloqueFinal({ compraAbierta }: { compraAbierta: boolean }) {
  if (!compraAbierta) {
    return (
      <section
        id="avisame"
        aria-labelledby="titulo-final"
        className="scroll-mt-nav bg-tinta pt-6 pb-12 text-white diferido sm:pt-10 sm:pb-16"
      >
        <Contenedor className="aparecer max-w-2xl text-center">
          <h2 id="titulo-final" className="text-4xl font-medium sm:text-6xl">
            Abrimos muy pronto.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gris-claro">
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
      className="bg-tinta pt-6 pb-12 text-white diferido sm:pt-10 sm:pb-16"
    >
      <Contenedor className="aparecer text-center">
        <h2 id="titulo-final" className="text-4xl font-medium sm:text-6xl">
          ¿Te animas?
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
            O elige tú las piezas ›
          </Boton>
        </div>
      </Contenedor>
    </section>
  );
}
