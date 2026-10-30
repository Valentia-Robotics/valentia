"use client";

import { Bot, ChevronUp, CircleX, TriangleAlert } from "lucide-react";
import { formatearPrecio, plural } from "@/lib/utils";
import { useConfigurador } from "@/store/configurador";
import type { Robot } from "./useRobot";

/**
 * Barra fija abajo (solo en móvil y tablet) con el resumen del robot.
 * Al pulsarla se abre el panel "Tu robot" completo.
 */
export function BarraRobotMovil({ robot, alAbrir }: { robot: Robot; alAbrir: () => void }) {
  const vez = useConfigurador((estado) => estado.ultimaAnadida?.vez ?? 0);
  const { totalPiezas, totalCentimos, diagnostico } = robot;

  return (
    <div
      // "data-barra-inferior" reserva hueco al final de la página (ver globals.css)
      data-barra-inferior
      className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
    >
      <button
        type="button"
        onClick={alAbrir}
        aria-haspopup="dialog"
        className="flex w-full items-center gap-3 rounded-boton bg-tinta py-2.5 pr-5 pl-3 text-left text-white"
      >
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Bot aria-hidden="true" className="size-5" strokeWidth={1.6} />
          {totalPiezas > 0 && (
            <span
              key={vez} // al cambiar, el numerito vuelve a "latir"
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-5 min-w-5 animate-latido items-center justify-center rounded-full bg-acento px-1 text-[11px] font-semibold"
            >
              {totalPiezas}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Ver tu robot</span>
          <span className="flex items-center gap-1 text-xs text-gris-claro">
            {plural(totalPiezas, "pieza", "piezas")}
            {diagnostico.errores > 0 ? (
              <>
                {" · "}
                <CircleX aria-hidden="true" className="size-3.5 text-error" />
                {plural(diagnostico.errores, "problema", "problemas")}
              </>
            ) : diagnostico.advertencias > 0 ? (
              <>
                {" · "}
                <TriangleAlert aria-hidden="true" className="size-3.5 text-aviso" />
                {plural(diagnostico.advertencias, "aviso", "avisos")}
              </>
            ) : null}
          </span>
        </span>
        <span className="font-titulo text-xl tabular-nums">{formatearPrecio(totalCentimos)}</span>
        <ChevronUp aria-hidden="true" className="size-5 shrink-0" />
      </button>
    </div>
  );
}
