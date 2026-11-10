import { FormularioAvisame } from "@/components/espera/FormularioAvisame";
import { Contenedor } from "@/components/ui/Contenedor";

/**
 * Aviso pequeño justo debajo del robot de la portada, mientras la tienda no cobra.
 * Mucha gente no baja hasta el final, así que el «Avísame» también va aquí arriba.
 * Va en un recuadro de puntos, como una nota grapada al cartel.
 */
export function AvisoApertura() {
  return (
    <section aria-labelledby="titulo-aviso-apertura" className="bg-white py-6">
      <Contenedor>
        <div className="flex flex-col gap-5 rounded-recto border border-dashed border-tinta/30 bg-niebla px-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-8">
          <div className="max-w-md">
            <p className="font-mono text-xs text-tinta/60">● Aviso</p>
            <h2 id="titulo-aviso-apertura" className="mt-1 font-sans text-lg font-semibold">
              Todavía no vendemos online.
            </h2>
            <p className="mt-1 text-gris">Déjanos tu email y te escribimos el día que abramos.</p>
          </div>
          <FormularioAvisame origen="portada" className="w-full lg:max-w-md" />
        </div>
      </Contenedor>
    </section>
  );
}
