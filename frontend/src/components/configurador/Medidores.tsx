import type { Medidor } from "@/lib/compatibilidad";
import { Lectura } from "./Lectura";

/** Lecturas del banco: GPIO de la placa y corriente de pico frente a la fuente (segmentos). */
export function Medidores({ medidores }: { medidores: Medidor[] }) {
  if (medidores.length === 0) return null;
  return (
    <div className="space-y-4">
      {medidores.map((m) => (
        <Lectura
          key={m.id}
          etiqueta={m.etiqueta}
          usados={m.usados}
          disponibles={m.disponibles}
          unidad={m.unidad}
          segmentos={m.id === "pines" && m.disponibles > 0 ? Math.min(40, m.disponibles) : 20}
        />
      ))}
    </div>
  );
}
