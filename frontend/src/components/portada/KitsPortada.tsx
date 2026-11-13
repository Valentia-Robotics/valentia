import Link from "next/link";
import { FormularioAvisame } from "@/components/espera/FormularioAvisame";
import { Contenedor } from "@/components/ui/Contenedor";
import { listaDeTextos, type KitResumen } from "@/lib/catalogo";
import { formatearPrecio } from "@/lib/utils";
import { cuantosKits, queHace } from "./datosKit";
import { FranjaChips } from "@/components/layout/FranjaChips";
import { Etiqueta } from "./Etiqueta";
import { GaleriaKits } from "./GaleriaKits";

/**
 * LOS KITS EN LA PORTADA, SOBRE LA PLACA VERDE (Jesse, 12-11-2026: «la misma interfaz verde con
 * chips, bien repartido, más organizado y más limpio», y sin frases genéricas).
 * La sección es una placa perforada (.placa-rejilla) y cada kit, un chip blanco montado encima:
 * cabecera negra con su referencia (U1, U2…), patas plateadas a los lados (.chip-patas) y sombra cobre.
 * Pensado como cliente, en el orden en que se lo pregunta:
 *   1. ¿Qué es esto? Titular con el número real de kits + qué trae cada caja.
 *   2. ¿Puedo comprar ya? Mientras la tienda no cobra, UNA franja con el «Avísame» (antes un recuadro aparte).
 *   3. Los kits, TODOS IGUALES en una fila (Jesse: el destacado grande y los demás pequeños se leía mal):
 *      foto, qué hace, montaje, curso y precio en el mismo sitio de cada tarjeta, para compararlos.
 * Todos los datos salen de la BD (lo que se cambie en el panel sale aquí solo).
 */
export function KitsPortada({
  estrella,
  kits,
  compraAbierta,
}: {
  estrella: KitResumen | undefined;
  kits: KitResumen[];
  compraAbierta: boolean;
}) {
  // Todos iguales, en fila y con los mismos datos en el mismo sitio: así se comparan de un vistazo
  const todos = estrella ? [estrella, ...kits] : kits;
  const total = todos.length;
  if (total === 0) return null;

  return (
    <section
      id="kits"
      aria-labelledby="titulo-kits"
      className="placa-rejilla relative isolate overflow-x-clip pt-16 pb-20 text-white sm:pt-20 sm:pb-28"
    >
      <Contenedor>
        <div className="aparecer grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Etiqueta oscura>Los kits</Etiqueta>
            <h2
              id="titulo-kits"
              className="titular-cartel mt-5 max-w-3xl text-5xl font-medium sm:text-6xl"
            >
              {cuantosKits(total, true)} para montar en casa, sin soldar.
            </h2>
          </div>
          <p className="max-w-md font-serif text-lg leading-snug text-white/85 lg:justify-self-end">
            Las piezas se enchufan, encajan o se unen con imanes. Cada caja trae todo lo necesario,
            también las baterías y el cable USB, y un curso en vídeo con el montaje y la
            programación paso a paso.
          </p>
        </div>

        {!compraAbierta && (
          <div className="mt-10 grid gap-4 border-y border-dashed border-white/25 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center lg:gap-10">
            <p className="text-base">
              <span className="mr-2 inline-block size-2 bg-senal align-middle" aria-hidden="true" />
              <strong className="font-semibold">Aún no vendemos online.</strong>{" "}
              <span className="text-white/80">
                Deja tu email y te mandaremos un correo el día que abra la tienda.
              </span>
            </p>
            <FormularioAvisame origen="portada" oscuro />
          </div>
        )}

        <FranjaChips />

        <div className="aparecer mt-6">
          <GaleriaKits
            kits={todos.map((k) => ({
              slug: k.slug,
              nombre: k.nombre,
              imagen: k.imagen,
              nivel: k.nivel,
              edadMinima: k.edadMinima,
              montaje: k.tiempoMontaje,
              hace: queHace(listaDeTextos(k.puntosFuertes)).slice(0, 3),
              precio: formatearPrecio(k.precioCentimos),
              lecciones: k.curso._count.lecciones,
            }))}
          />
          <p className="mt-8 text-right">
            <Link
              href="/kits"
              className="font-mono text-xs text-white/75 underline-offset-4 hover:text-white hover:underline"
            >
              Ver todos los kits y compararlos →
            </Link>
          </p>
        </div>
      </Contenedor>
    </section>
  );
}
