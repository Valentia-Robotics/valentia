import { Boton } from "@/components/ui/Boton";
import { formatearNumero } from "@/lib/utils";
import { CampoPixeles } from "./CampoPixeles";
import { Etiqueta, PalabrasQueSuben } from "./Etiqueta";

/**
 * PRIMERA PANTALLA DE LA PORTADA: un campo de color con píxeles vivos (CampoPixeles), el titular
 * en grande y las dos puertas de entrada. Debajo van la cinta de piezas y el robot por dentro (PiezasPortada).
 * La raya de colores de la izquierda es la «regla» del taller: azul, blanco y amarillo.
 */
export function HeroPortada({
  cifras,
}: {
  cifras: { kits: number; componentes: number; lecciones: number };
}) {
  return (
    <section aria-labelledby="titulo-portada" className="campo-cielo relative isolate overflow-hidden">
      <CampoPixeles />
      {/* Regla de colores del borde izquierdo */}
      <div aria-hidden="true" className="absolute inset-y-6 left-3 flex w-1.5 flex-col sm:left-5">
        <span className="flex-[5] bg-acento" />
        <span className="flex-[2] bg-white" />
        <span className="flex-[3] bg-senal" />
      </div>

      <div className="relative mx-auto flex min-h-[min(88svh,52rem)] max-w-6xl flex-col justify-center px-8 pt-14 pb-36 sm:px-12 sm:pb-40 lg:pb-28">
        <Etiqueta>Kits de robótica · con curso en vídeo</Etiqueta>
        <h1
          id="titulo-portada"
          className="titular-cartel mt-6 max-w-4xl text-[3.4rem] font-medium sm:text-8xl lg:text-[8.5rem]"
        >
          <PalabrasQueSuben texto="Construye tu propio robot." />
        </h1>
        {/* Sin animación de entrada: es lo primero grande que pinta la página (LCP) */}
        <p className="mt-8 max-w-sm font-serif text-lg leading-snug sm:text-xl">
          No hace falta saber programar. En la caja van todas las piezas y un curso que te acompaña
          desde la primera pieza hasta que el robot echa a andar.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Boton href="/kits" variante="bloque" tamano="lg">
            Ver los kits
          </Boton>
          <Boton href="/configurador" variante="punteado" tamano="lg">
            Crear mi robot
          </Boton>
        </div>
        <p className="mt-10 font-mono text-xs text-tinta/70">
          ↳ {formatearNumero(cifras.kits)} kits · {formatearNumero(cifras.componentes)} piezas
          sueltas · {formatearNumero(cifras.lecciones)} lecciones en vídeo
        </p>
      </div>
    </section>
  );
}
