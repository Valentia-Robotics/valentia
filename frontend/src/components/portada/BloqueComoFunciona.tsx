import { Contenedor } from "@/components/ui/Contenedor";

const pasos: { titulo: string; texto: string }[] = [
  { titulo: "Abre la caja", texto: "Dentro va todo lo que necesitas." },
  { titulo: "Escanea el código", texto: "Se abre tu curso en vídeo, paso a paso." },
  { titulo: "Monta y juega", texto: "Las piezas encajan. No hay que soldar." },
];

/**
 * CÓMO FUNCIONA: tres pasos, un número grande y una frase cada uno. Nada más: se tiene que entender
 * con 10 años y con 70 (CRITERIOS_DISENO.md: poco texto y poco detalle).
 */
export function BloqueComoFunciona() {
  return (
    <section aria-labelledby="titulo-como-funciona" className="bg-estudio py-20 sm:py-28">
      <Contenedor>
        <h2
          id="titulo-como-funciona"
          className="aparecer titular-cartel text-4xl font-medium sm:text-6xl"
        >
          Así de fácil.
        </h2>

        <ol className="mt-12 grid gap-5 sm:mt-14 md:grid-cols-3">
          {pasos.map(({ titulo, texto }, i) => (
            // En el móvil, el número va al lado (ocupa menos alto); en pantallas anchas, encima
            <li
              key={titulo}
              className="aparecer flex gap-5 rounded-tarjeta bg-white p-6 md:block md:p-8"
            >
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tinta font-titulo text-xl font-medium text-white"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-2xl font-medium tracking-tight md:mt-8 md:text-3xl">
                  {titulo}
                </h3>
                <p className="mt-1.5 text-lg leading-snug text-tinta/70">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </Contenedor>
    </section>
  );
}
