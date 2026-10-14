"use client";

import { CircleCheck, CircleX, Info, Plus, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Aviso, Diagnostico, Nivel } from "@/lib/compatibilidad";
import { cn } from "@/lib/utils";
import type { ComponenteCatalogo } from "@/types/catalogo";

const estilos: Record<Nivel, { icono: LucideIcon; color: string; fondo: string; texto: string }> = {
  error: { icono: CircleX, color: "text-error", fondo: "bg-error/8", texto: "Problema" },
  aviso: { icono: TriangleAlert, color: "text-aviso", fondo: "bg-aviso/8", texto: "Atención" },
  info: { icono: Info, color: "text-acento", fondo: "bg-acento/6", texto: "Consejo" },
};

interface Props {
  diagnostico: Diagnostico;
  /** Para convertir el slug sugerido en nombre y poder añadirlo */
  buscarComponente: (slug: string) => ComponenteCatalogo | undefined;
  alAnadirSugerencia: (slug: string) => void;
}

/** Lista de avisos de compatibilidad, del más grave al menos grave. */
export function AvisosCompatibilidad({ diagnostico, buscarComponente, alAnadirSugerencia }: Props) {
  const { avisos, errores, advertencias } = diagnostico;
  const todoEncaja = errores === 0 && advertencias === 0;

  return (
    <section aria-label="Compatibilidad" className="space-y-2">
      {/* Resumen que leen los lectores de pantalla cuando cambia */}
      <p role="status" className="sr-only">
        {todoEncaja
          ? "Todo encaja"
          : `${errores} problemas y ${advertencias} advertencias de compatibilidad`}
      </p>

      {todoEncaja && (
        <p className="flex items-start gap-2.5 rounded-control bg-exito/8 p-3 text-sm">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-exito" />
          <span>
            <strong className="font-medium text-exito">¡Todo encaja!</strong> Las piezas de tu robot
            son compatibles entre sí.
          </span>
        </p>
      )}

      {avisos.map((aviso) => (
        <TarjetaAviso
          key={aviso.id}
          aviso={aviso}
          sugerida={aviso.sugerencia ? buscarComponente(aviso.sugerencia) : undefined}
          alAnadirSugerencia={alAnadirSugerencia}
        />
      ))}
    </section>
  );
}

function TarjetaAviso({
  aviso,
  sugerida,
  alAnadirSugerencia,
}: {
  aviso: Aviso;
  sugerida?: ComponenteCatalogo;
  alAnadirSugerencia: (slug: string) => void;
}) {
  const { icono: Icono, color, fondo, texto } = estilos[aviso.nivel];

  return (
    <div className={cn("flex items-start gap-2.5 rounded-control p-3 text-sm", fondo)}>
      <Icono aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", color)} />
      <div className="min-w-0">
        <p className={cn("font-medium", color)}>
          <span className="sr-only">{texto}: </span>
          {aviso.titulo}
        </p>
        <p className="mt-0.5 text-tinta/80">{aviso.mensaje}</p>
        {sugerida && sugerida.stock > 0 && (
          <button
            type="button"
            onClick={() => alAnadirSugerencia(sugerida.slug)}
            className="mt-2 inline-flex items-center gap-1 rounded-boton bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-linea transition-colors hover:ring-tinta"
          >
            <Plus aria-hidden="true" className="size-3.5" />
            Añadir {sugerida.nombre}
          </button>
        )}
      </div>
    </div>
  );
}
