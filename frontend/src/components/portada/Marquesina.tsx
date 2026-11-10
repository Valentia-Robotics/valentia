import { Etiqueta } from "./Etiqueta";

/** Color del cuadradito de cada pieza según su categoría (como los chips de una placa) */
const COLOR_CATEGORIA: Record<string, string> = {
  PLACAS: "bg-acento",
  SENSORES: "bg-senal",
  MOTORES: "bg-exito",
  ALIMENTACION: "bg-error",
  CHASIS: "bg-tinta",
  EXTRAS: "bg-acento-claro",
};

/**
 * CINTA DE PIEZAS: los componentes reales de la tienda pasando despacio, cada uno con su chip de
 * color. Se para al pasar el ratón. Con «reducir movimiento» se queda quieta (y se puede deslizar).
 */
export function Marquesina({ piezas }: { piezas: { nombre: string; categoria: string }[] }) {
  if (piezas.length === 0) return null;
  // Repetida para que la cinta no se acabe nunca (la animación avanza justo la mitad)
  const vuelta = [...piezas, ...piezas];
  return (
    <section aria-labelledby="titulo-piezas" className="cinta-pausa overflow-hidden bg-white py-10">
      <div className="mx-auto max-w-6xl px-8 sm:px-12">
        <Etiqueta>
          <span id="titulo-piezas">Piezas de verdad, las mismas que usan los makers</span>
        </Etiqueta>
      </div>
      <div className="mt-6 [scrollbar-width:none] overflow-x-auto motion-safe:overflow-x-hidden">
        <ul className="cinta flex w-max gap-3 px-8 sm:px-12">
          {vuelta.map((p, i) => (
            <li
              key={i}
              aria-hidden={i >= piezas.length || undefined}
              className="flex shrink-0 items-center gap-2.5 rounded-recto bg-niebla py-2 pr-4 pl-2.5 font-medium whitespace-nowrap"
            >
              <span
                aria-hidden="true"
                className={`grid size-5 place-items-center rounded-[3px] ${COLOR_CATEGORIA[p.categoria] ?? "bg-tinta"}`}
              >
                <span className="size-1.5 rounded-full bg-white/80" />
              </span>
              {p.nombre}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
