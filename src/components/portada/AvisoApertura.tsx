import { FormularioAvisame } from "@/components/espera/FormularioAvisame";
import { Contenedor } from "@/components/ui/Contenedor";

/**
 * Aviso pequeño justo debajo del robot de la portada, mientras la tienda no cobra.
 * Mucha gente no baja hasta el final, así que el «Avísame» también va aquí arriba.
 */
export function AvisoApertura() {
  return (
    <section aria-labelledby="titulo-aviso-apertura" className="border-y border-linea bg-niebla">
      <Contenedor className="flex flex-col gap-5 py-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="max-w-md">
          <h2 id="titulo-aviso-apertura" className="font-sans text-lg font-semibold">
            Todavía no vendemos online.
          </h2>
          <p className="mt-1 text-gris">
            Estamos preparando las primeras cajas. Déjanos tu email y te avisamos el día que
            abramos.
          </p>
        </div>
        <FormularioAvisame origen="portada" className="w-full lg:max-w-md" />
      </Contenedor>
    </section>
  );
}
