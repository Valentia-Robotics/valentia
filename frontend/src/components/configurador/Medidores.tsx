import type { Medidor } from "@/lib/compatibilidad";
import { cn, formatearNumero } from "@/lib/utils";

/** Barras de "cuánto llevas usado": pines de la placa y energía de la batería. */
export function Medidores({ medidores }: { medidores: Medidor[] }) {
  if (medidores.length === 0) return null;

  return (
    <div className="space-y-3">
      {medidores.map((m) => {
        const proporcion = m.disponibles > 0 ? m.usados / m.disponibles : 1;
        const color = proporcion > 1 ? "bg-error" : proporcion >= 0.8 ? "bg-aviso" : "bg-acento";
        return (
          <div key={m.id}>
            <div className="flex justify-between text-xs">
              <span className="text-gris">{m.etiqueta}</span>
              <span className="tabular-nums">
                {formatearNumero(m.usados)} / {formatearNumero(m.disponibles)} {m.unidad}
              </span>
            </div>
            <div
              role="meter"
              aria-label={m.etiqueta}
              aria-valuemin={0}
              aria-valuemax={m.disponibles}
              aria-valuenow={m.usados}
              aria-valuetext={`${formatearNumero(m.usados)} de ${formatearNumero(m.disponibles)} ${m.unidad}`}
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-linea/70"
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", color)}
                style={{ width: `${Math.min(proporcion, 1) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
