"use client";

import { useState } from "react";
import { BellRing, CalendarClock, Check, ClipboardList, UserRound } from "lucide-react";
import { marcarEstadoTarea, marcarPrioridad, type Respuesta } from "@/app/mensajes/acciones";
import {
  ESTADOS,
  PRIORIDADES,
  datosEstado,
  datosPrioridad,
  textoFechaTarea,
  vencida,
  type Estado,
  type Prioridad,
} from "@/config/mensajes";
import type { Mensaje } from "@/lib/mensajes/mensajes";
import { cn } from "@/lib/utils";

/** Etiqueta de color de la prioridad (rojo, amarillo, verde) */
export function EtiquetaPrioridad({ prioridad }: { prioridad: Prioridad | null }) {
  const p = datosPrioridad(prioridad);
  if (!p) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
        p.etiqueta,
      )}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", p.punto)} />
      {p.nombre}
    </span>
  );
}

/**
 * Los datos de una tarea, como una ficha de Notion: estado, prioridad, entrega, responsable y
 * recordatorio. El estado y la prioridad se cambian desde aquí con un clic.
 */
export function TarjetaTarea({
  tarea,
  accion,
}: {
  tarea: Mensaje;
  /** Ejecuta una acción del servidor y refresca la pantalla */
  accion: (hacer: () => Promise<Respuesta>) => void;
}) {
  const [eligiendoPrioridad, setEligiendoPrioridad] = useState(false);
  const estado = datosEstado(tarea.estadoTarea);
  const atrasada = vencida(tarea.entregaEn, tarea.estadoTarea);

  return (
    <div className="mb-1 flex flex-col gap-1.5 border-b border-tinta/10 pb-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 font-semibold text-tinta/70">
          <ClipboardList aria-hidden="true" className="size-3.5" />
          Tarea
        </span>
        {/* Estado: tres botones pequeños, como las columnas de un tablero */}
        <span className="inline-flex overflow-hidden rounded border border-tinta/10">
          {ESTADOS.map((e) => (
            <button
              key={e.valor}
              type="button"
              aria-pressed={tarea.estadoTarea === e.valor}
              onClick={() =>
                tarea.estadoTarea !== e.valor &&
                accion(() => marcarEstadoTarea(tarea.id, e.valor as Estado))
              }
              className={cn(
                "px-1.5 py-0.5 font-medium transition-colors",
                tarea.estadoTarea === e.valor ? e.etiqueta : "text-gris hover:bg-tinta/5",
              )}
            >
              {e.valor === "HECHA" && (
                <Check aria-hidden="true" className="mr-0.5 inline size-3 align-[-2px]" />
              )}
              {e.nombre}
            </button>
          ))}
        </span>
        {eligiendoPrioridad ? (
          <span className="inline-flex gap-1">
            {PRIORIDADES.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => {
                  setEligiendoPrioridad(false);
                  accion(() => marcarPrioridad(tarea.id, p.valor));
                }}
                className={cn("rounded px-1.5 py-0.5 font-medium", p.etiqueta)}
              >
                {p.nombre}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setEligiendoPrioridad(false);
                accion(() => marcarPrioridad(tarea.id, null));
              }}
              className="rounded px-1.5 py-0.5 text-gris hover:bg-tinta/5"
            >
              Sin prioridad
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setEligiendoPrioridad(true)}
            title="Cambiar la prioridad"
            className="rounded hover:ring-1 hover:ring-tinta/20"
          >
            {tarea.prioridad ? (
              <EtiquetaPrioridad prioridad={tarea.prioridad} />
            ) : (
              <span className="px-1.5 py-0.5 text-gris">+ Prioridad</span>
            )}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gris">
        {tarea.responsableNombre && (
          <span className="inline-flex items-center gap-1">
            <UserRound aria-hidden="true" className="size-3.5" />
            Para {tarea.responsableNombre}
          </span>
        )}
        {tarea.entregaEn && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              atrasada && "font-medium text-error-oscuro",
            )}
          >
            <CalendarClock aria-hidden="true" className="size-3.5" />
            {atrasada ? "Venció: " : "Entrega: "}
            {textoFechaTarea(tarea.entregaEn)}
          </span>
        )}
        {tarea.recordarEn && tarea.estadoTarea !== "HECHA" && (
          <span className="inline-flex items-center gap-1">
            <BellRing aria-hidden="true" className="size-3.5" />
            {textoFechaTarea(tarea.recordarEn)}
          </span>
        )}
        {tarea.estadoTarea === "HECHA" && tarea.hechaPor && (
          <span className={cn("rounded px-1", estado.etiqueta)}>Hecha por {tarea.hechaPor}</span>
        )}
      </div>
    </div>
  );
}
