"use client";

import { PRIORIDADES, RECORDATORIOS } from "@/config/mensajes";
import { cn } from "@/lib/utils";

/** Lo que se elige al escribir una tarea (las fechas, como las da el <input>: hora del navegador) */
export interface OpcionesTareaValor {
  prioridad: string;
  responsableId: string;
  entrega: string;
  recordatorio: string;
  recordatorioOtro: string;
}

export const opcionesVacias = (responsableId = ""): OpcionesTareaValor => ({
  prioridad: "",
  responsableId,
  entrega: "",
  recordatorio: "",
  recordatorioOtro: "",
});

/** «2026-11-10T18:00» (hora del navegador) → ISO, que el servidor entiende sin dudas */
const aISO = (valor: string) => (valor ? new Date(valor).toISOString() : "");

/** Lo que se manda al servidor */
export function tareaParaEnviar(v: OpcionesTareaValor) {
  return {
    prioridad: v.prioridad,
    responsableId: v.responsableId,
    entrega: aISO(v.entrega),
    recordatorio: v.recordatorio,
    recordatorioOtro: aISO(v.recordatorioOtro),
  };
}

const claseCampo =
  "h-9 rounded-md border border-linea bg-white px-2 text-sm outline-none focus:border-acento";

/**
 * EL PANEL DE «TAREA» encima del cuadro de texto: prioridad (semáforo), para quién, fecha y hora
 * de entrega y recordatorio (alarma en la web y correo).
 */
export function OpcionesTarea({
  valor,
  cambiar,
  personas,
}: {
  valor: OpcionesTareaValor;
  cambiar: (v: OpcionesTareaValor) => void;
  personas: { id: string; nombre: string }[];
}) {
  const poner = (campo: keyof OpcionesTareaValor, v: string) => cambiar({ ...valor, [campo]: v });
  const necesitaEntrega =
    valor.recordatorio !== "" && valor.recordatorio !== "otra" && !valor.entrega;

  return (
    <fieldset className="mx-auto mb-2 grid max-w-3xl gap-3 rounded-xl border border-aviso/30 bg-aviso/5 p-3 text-sm sm:grid-cols-2">
      <legend className="sr-only">Datos de la tarea</legend>

      <div className="sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-gris">Prioridad</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { valor: "", nombre: "Sin prioridad", etiqueta: "bg-white text-gris", punto: "" },
            ...PRIORIDADES,
          ].map((p) => (
            <button
              key={p.valor}
              type="button"
              aria-pressed={valor.prioridad === p.valor}
              onClick={() => poner("prioridad", p.valor)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                p.etiqueta,
                valor.prioridad === p.valor
                  ? "border-tinta ring-1 ring-tinta"
                  : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              {p.punto && (
                <span aria-hidden="true" className={cn("size-2.5 rounded-full", p.punto)} />
              )}
              {p.nombre}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gris">Para quién</span>
        <select
          value={valor.responsableId}
          onChange={(e) => poner("responsableId", e.target.value)}
          className={claseCampo}
        >
          <option value="">Nadie en concreto</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gris">Entrega (día y hora)</span>
        <input
          type="datetime-local"
          value={valor.entrega}
          onChange={(e) => poner("entrega", e.target.value)}
          className={claseCampo}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gris">Recordatorio (alarma)</span>
        <select
          value={valor.recordatorio}
          onChange={(e) => poner("recordatorio", e.target.value)}
          className={claseCampo}
        >
          {RECORDATORIOS.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.nombre}
            </option>
          ))}
        </select>
        {necesitaEntrega && (
          <span className="text-xs text-aviso-oscuro">Pon también la fecha de entrega.</span>
        )}
      </label>

      {valor.recordatorio === "otra" && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gris">Que suene el</span>
          <input
            type="datetime-local"
            value={valor.recordatorioOtro}
            onChange={(e) => poner("recordatorioOtro", e.target.value)}
            className={claseCampo}
          />
        </label>
      )}

      <p className="text-xs text-gris sm:col-span-2">
        El recordatorio suena en la web de quien tiene que hacerla (o en la tuya si es para nadie en
        concreto) y le llega también por correo.
      </p>
    </fieldset>
  );
}
