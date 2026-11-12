import { Etiqueta } from "@/components/portada/Etiqueta";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { EscenarioPiezas } from "@/components/tienda/EscenarioPiezas";
import type { ComponenteCatalogo } from "@/types/catalogo";

/**
 * Bloque de la portada que invita a montar tu propio robot en el configurador.
 * Sobre negro de estudio: cada apartado enseña su pieza de referencia, que se abre en 3D.
 */
export function BloqueConfigurador({ componentes }: { componentes: ComponenteCatalogo[] }) {
  return (
    <section
      aria-labelledby="titulo-configurador"
      className="bg-tinta pt-10 pb-16 text-white diferido sm:pt-14 sm:pb-24"
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
            Cada apartado tiene su pieza de referencia: míralas por todos lados antes de elegir. Si dos piezas no funcionan
            juntas, el configurador te lo dice antes de que compres nada.
          </p>
        </div>

        <EscenarioPiezas componentes={componentes} />

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
