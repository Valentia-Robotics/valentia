"use client";

import type { Aviso, Diagnostico, Nivel } from "@/lib/compatibilidad";
import { cn } from "@/lib/utils";
import type { ComponenteCatalogo } from "@/types/catalogo";

const estilos: Record<Nivel, { etiqueta: string; color: string; texto: string }> = {
  error: { etiqueta: "ERR", color: "text-error", texto: "Error" },
  aviso: { etiqueta: "WARN", color: "text-aviso", texto: "Advertencia" },
  info: { etiqueta: "INFO", color: "text-gris", texto: "Nota" },
};

interface Props {
  diagnostico: Diagnostico;
  /** Para convertir el slug sugerido en nombre y poder añadirlo */
  buscarComponente: (slug: string) => ComponenteCatalogo | undefined;
  alAnadirSugerencia: (slug: string) => void;
}

/**
 * REGISTRO DE COMPATIBILIDAD del banco de pruebas: una línea por aviso, del más grave al menos grave,
 * con su nivel en mono ([ERR] [WARN] [INFO]) y, si hay arreglo, la tecla para añadir la pieza sugerida.
 */
export function AvisosCompatibilidad({ diagnostico, buscarComponente, alAnadirSugerencia }: Props) {
  const { avisos, errores, advertencias } = diagnostico;
  const todoEncaja = errores === 0 && advertencias === 0;

  return (
    <section aria-label="Compatibilidad" className="border-t border-linea">
      {/* Resumen que leen los lectores de pantalla cuando cambia */}
      <p role="status" className="sr-only">
        {todoEncaja
          ? "Sin conflictos de compatibilidad"
          : `${errores} errores y ${advertencias} advertencias de compatibilidad`}
      </p>

      {todoEncaja && (
        <p className="flex items-start gap-3 border-b border-linea py-2.5 text-sm">
          <span className="font-mono text-[11px] text-led">[OK]</span>
          <span className="text-gris">
            Sin conflictos: GPIO, corriente y niveles lógicos dentro de rango.
          </span>
        </p>
      )}

      {avisos.map((aviso) => (
        <LineaAviso
          key={aviso.id}
          aviso={aviso}
          sugerida={aviso.sugerencia ? buscarComponente(aviso.sugerencia) : undefined}
          alAnadirSugerencia={alAnadirSugerencia}
        />
      ))}
    </section>
  );
}

function LineaAviso({
  aviso,
  sugerida,
  alAnadirSugerencia,
}: {
  aviso: Aviso;
  sugerida?: ComponenteCatalogo;
  alAnadirSugerencia: (slug: string) => void;
}) {
  const { etiqueta, color, texto } = estilos[aviso.nivel];
  return (
    <div className="flex items-start gap-3 border-b border-linea py-2.5 text-sm">
      <span className={cn("w-11 shrink-0 font-mono text-[11px]", color)}>
        <span aria-hidden="true">[{etiqueta}]</span>
        <span className="sr-only">{texto}:</span>
      </span>
      <div className="min-w-0">
        <p className="font-medium text-tinta">{aviso.titulo}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-gris">{aviso.mensaje}</p>
        {sugerida && sugerida.stock > 0 && (
          <button
            type="button"
            onClick={() => alAnadirSugerencia(sugerida.slug)}
            className="tecla mono-etiqueta mt-2 border border-borde-fuerte px-2.5 py-1.5 text-tinta transition-colors duration-100 hover:border-acento hover:text-acento"
          >
            + Añadir {sugerida.nombre}
          </button>
        )}
      </div>
    </div>
  );
}
