import Image from "next/image";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";

/** Unas pocas piezas de muestra (las fotos de estudio del configurador) */
const PIEZAS = [
  { src: "/images/componentes/esp32-devkit.svg", alt: "Placa ESP32" },
  { src: "/images/componentes/motor-dc-reductora.svg", alt: "Motor con reductora" },
  { src: "/images/componentes/sensor-ultrasonidos-hc-sr04.svg", alt: "Sensor de ultrasonidos" },
  { src: "/images/componentes/servo-sg90.svg", alt: "Servomotor" },
];

/**
 * Bloque de la portada que invita a montar un robot a tu manera en el configurador: una frase, un
 * botón y cuatro piezas de muestra sobre el papel del estudio.
 */
export function BloqueConfigurador() {
  return (
    <section aria-labelledby="titulo-configurador" className="bg-white pb-20 diferido sm:pb-28">
      <Contenedor>
        <div className="aparecer grid items-center gap-10 overflow-hidden rounded-[2rem] bg-estudio px-7 py-12 sm:px-12 sm:py-16 lg:grid-cols-2 lg:gap-12">
          <div>
            <h2
              id="titulo-configurador"
              className="titular-cartel text-4xl font-medium sm:text-6xl"
            >
              O invéntate el tuyo.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-tinta/70 sm:text-xl">
              Elige las piezas una a una. Si algo no encaja, te avisamos.
            </p>
            <Boton href="/configurador" variante="primario" tamano="lg" className="mt-8">
              Crear mi robot
            </Boton>
          </div>
          <ul className="grid grid-cols-2 gap-4">
            {PIEZAS.map(({ src, alt }) => (
              <li
                key={src}
                className="flex aspect-[4/3] items-center justify-center rounded-3xl bg-white p-4"
              >
                <Image
                  src={src}
                  alt={alt}
                  width={400}
                  height={300}
                  unoptimized
                  className="h-auto max-h-full w-auto max-w-full"
                />
              </li>
            ))}
          </ul>
        </div>
      </Contenedor>
    </section>
  );
}
