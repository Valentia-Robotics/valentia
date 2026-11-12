import { EsquemaBloques } from "@/components/configurador/EsquemaBloques";
import { Lectura } from "@/components/configurador/Lectura";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { Led } from "@/components/ui/Led";
import { MarcoCAD } from "@/components/ui/MarcoCAD";
import type { KitConPiezas } from "@/lib/catalogo";
import { resumenTecnico } from "@/lib/resumenTecnico";
import { formatearNumero } from "@/lib/utils";

/**
 * SEC_03 · BANCO DE PRUEBAS: el esquema de bloques del VR1 y sus lecturas (GPIO, corriente, lógica),
 * calculados con el motor del configurador sobre sus piezas reales. Lleva al configurador.
 */
export function BancoPruebasPortada({ kit }: { kit: KitConPiezas | undefined }) {
  if (!kit || kit.piezas.length === 0) return null;
  const r = resumenTecnico(kit.piezas);
  const logicaOk = !r.avisos.includes("logica-5v-en-placa-3v3");
  return (
    <section
      aria-labelledby="titulo-banco"
      className="rejilla-plano border-t border-linea py-20 sm:py-28"
    >
      <Contenedor className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
        <div className="aparecer">
          <p className="mono-etiqueta text-gris">
            <span className="text-acento">{"// "}</span>SEC_03 · Banco de pruebas
          </p>
          <h2 id="titulo-banco" className="titular-cartel mt-4 text-4xl font-semibold sm:text-5xl">
            Diseña el circuito antes de montarlo.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-gris">
            El configurador comprueba cada pieza que añades: GPIO ocupados frente a los de la placa,
            corriente de pico frente a la que entrega la batería y compatibilidad de niveles lógicos
            (3,3 V / 5 V). A la derecha, el VR1 tal y como sale de fábrica.
          </p>
          <Boton href="/configurador" variante="primario" tamano="lg" className="mt-8">
            Abrir el banco de pruebas
          </Boton>
        </div>

        <MarcoCAD
          etiqueta="Esquema de bloques · VR1"
          cota={`${kit.piezas.length} referencias`}
          className="aparecer bg-carbon p-5 pt-7 sm:p-7 sm:pt-9"
        >
          <EsquemaBloques piezas={kit.piezas} />
          <div className="mt-6 grid gap-5 border-t border-linea pt-5 sm:grid-cols-3">
            {r.gpio && (
              <Lectura
                etiqueta="GPIO"
                usados={r.gpio.usados}
                disponibles={r.gpio.disponibles}
                unidad="pines"
                segmentos={r.gpio.disponibles}
              />
            )}
            {r.corriente && (
              <Lectura
                etiqueta="Corriente pico"
                usados={r.corriente.usados}
                disponibles={r.corriente.disponibles}
                unidad="mA"
              />
            )}
            <div>
              <span className="mono-etiqueta text-gris">Niveles lógicos</span>
              <p className="mt-1.5">
                <Led
                  estado={logicaOk ? "ok" : "aviso"}
                  texto={
                    r.logica
                      ? `${formatearNumero(r.logica)} V · ${logicaOk ? "compatibles" : "revisar"}`
                      : "—"
                  }
                />
              </p>
            </div>
          </div>
        </MarcoCAD>
      </Contenedor>
    </section>
  );
}
