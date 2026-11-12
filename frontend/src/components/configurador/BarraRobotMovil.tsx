"use client";

import { ChevronUp } from "lucide-react";
import { Led } from "@/components/ui/Led";
import { formatearPrecio, plural } from "@/lib/utils";
import { useConfigurador } from "@/store/configurador";
import type { Robot } from "./useRobot";

/**
 * Barra fija abajo (solo en móvil y tablet) con el estado del montaje: piezas, LED de errores y total.
 * Al pulsarla se abre el panel completo (lista de materiales, esquema, lecturas y registro).
 */
export function BarraRobotMovil({ robot, alAbrir }: { robot: Robot; alAbrir: () => void }) {
  const vez = useConfigurador((estado) => estado.ultimaAnadida?.vez ?? 0);
  const { totalPiezas, totalCentimos, diagnostico, piezas } = robot;
  const { errores, advertencias } = diagnostico;

  return (
    <div
      // "data-barra-inferior" reserva hueco al final de la página (ver globals.css)
      data-barra-inferior
      className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-carbon/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
    >
      <button
        type="button"
        onClick={alAbrir}
        aria-haspopup="dialog"
        className="tecla flex w-full items-center gap-3 border border-borde-fuerte bg-panel py-2.5 pr-4 pl-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="mono-etiqueta flex items-center gap-2 text-tinta">
            Montaje
            <span key={vez} className="animate-latido text-acento tabular-nums">
              ×{totalPiezas}
            </span>
          </span>
          <span className="mt-1 flex items-center gap-1 text-xs text-gris">
            <Led
              estado={piezas.length === 0 ? "apagado" : errores ? "error" : advertencias ? "aviso" : "ok"}
              texto={
                errores
                  ? plural(errores, "error", "errores")
                  : advertencias
                    ? plural(advertencias, "advertencia", "advertencias")
                    : piezas.length
                      ? "Sin conflictos"
                      : "Vacío"
              }
              className="text-[10px] text-gris"
            />
          </span>
        </span>
        <span className="font-mono text-lg text-tinta tabular-nums">{formatearPrecio(totalCentimos)}</span>
        <ChevronUp aria-hidden="true" className="size-5 shrink-0 text-gris" />
      </button>
    </div>
  );
}
