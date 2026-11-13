"use client";

import { ALTO, ANCHO, ChipMontado, ESCALA, MONTAJES } from "./ChipsFijos";

/**
 * Los chips animados de los márgenes (ChipsFijos) no caben en un móvil ni en una pantalla estrecha:
 * aquí van en una franja, en fila, a menor tamaño (Jesse: que en el móvil también se vean los detalles).
 * Solo se ve por debajo de 1360 px, que es cuando ChipsFijos no se muestra.
 */
const REDUCCION = 0.5;

export function FranjaChips() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mt-8 flex justify-around min-[1360px]:hidden print:hidden"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{ width: ANCHO * ESCALA * REDUCCION, height: ALTO * ESCALA * REDUCCION }}
        >
          <div style={{ transform: `scale(${REDUCCION})`, transformOrigin: "top left" }}>
            <ChipMontado montaje={MONTAJES[i]} lado={i % 2 === 0 ? "izquierda" : "derecha"} />
          </div>
        </div>
      ))}
    </div>
  );
}
