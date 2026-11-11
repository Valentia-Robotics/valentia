import { FormularioAvisame } from "@/components/espera/FormularioAvisame";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { tienda } from "@/config/tienda";
import { formatearPrecio } from "@/lib/utils";

/**
 * Último bloque de la portada, sobre el papel del estudio (la página acaba como empieza).
 * Mientras la tienda no cobra, pide el email para avisar el día que abra; después, invita a elegir kit.
 */
export function BloqueFinal({ compraAbierta }: { compraAbierta: boolean }) {
  return (
    <section
      id="avisame"
      aria-labelledby="titulo-final"
      className="scroll-mt-nav bg-estudio py-24 sm:py-32"
    >
      <Contenedor className="aparecer max-w-2xl text-center">
        <h2 id="titulo-final" className="titular-cartel text-5xl font-medium sm:text-7xl">
          {compraAbierta ? "¿Te animas?" : "Abrimos muy pronto."}
        </h2>
        {compraAbierta ? (
          <>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-tinta/70 sm:text-xl">
              Envío a toda la {tienda.envio.nombreZona} en {tienda.envio.plazo}. Gratis desde{" "}
              {formatearPrecio(tienda.envio.gratisDesdeCentimos)}.
            </p>
            <Boton href="/kits" variante="primario" tamano="lg" className="mt-8">
              Elegir mi kit
            </Boton>
          </>
        ) : (
          <>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-tinta/70 sm:text-xl">
              Déjanos tu correo y te avisamos el día que se pueda comprar.
            </p>
            <FormularioAvisame origen="portada" className="mx-auto mt-8 max-w-md text-left" />
          </>
        )}
      </Contenedor>
    </section>
  );
}
