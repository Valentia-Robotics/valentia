"use client";

import { Lightbulb, LockOpen, Wrench } from "lucide-react";
import { useState, useTransition } from "react";
import { verSolucion } from "@/app/(cuenta)/cursos/acciones";
import { Boton } from "@/components/ui/Boton";

interface Props {
  id: string;
  numero: number;
  enunciado: string;
  pistas: string[];
  /** La solución, si ya la desbloqueó antes (si no, null: se pide al servidor) */
  solucionInicial: string | null;
}

/** Reto práctico: pistas que se descubren de una en una y solución que se puede desbloquear. */
export function EjercicioReto({ id, numero, enunciado, pistas, solucionInicial }: Props) {
  const [pistasVistas, setPistasVistas] = useState(solucionInicial ? pistas.length : 0);
  const [solucion, setSolucion] = useState(solucionInicial);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState(false);
  const [cargando, iniciar] = useTransition();

  function desbloquear() {
    iniciar(async () => {
      const resultado = await verSolucion(id);
      if (resultado.ok) setSolucion(resultado.solucion);
      setError(!resultado.ok);
      setConfirmar(false);
    });
  }

  return (
    <section className="rounded-tarjeta bg-white p-6 ring-1 ring-linea">
      <p className="flex items-center gap-2 text-sm font-medium text-acento">
        <Wrench aria-hidden="true" className="size-4" />
        Reto {numero}
      </p>
      <p className="mt-3 text-lg font-medium">{enunciado}</p>
      <p className="mt-1 text-sm text-gris">Pruébalo con tu kit. Si te atascas, tienes pistas.</p>

      {/* Pistas descubiertas */}
      <ol className="mt-4 space-y-2" aria-live="polite">
        {pistas.slice(0, pistasVistas).map((pista, i) => (
          <li key={pista} className="flex gap-3 rounded-control bg-aviso/8 p-3.5 text-sm">
            <Lightbulb aria-hidden="true" className="size-5 shrink-0 text-aviso" />
            <span>
              <span className="font-medium">Pista {i + 1}:</span> {pista}
            </span>
          </li>
        ))}
      </ol>

      {/* Solución */}
      <div aria-live="polite">
        {solucion && (
          <div className="mt-4 rounded-control bg-exito/8 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-exito">
              <LockOpen aria-hidden="true" className="size-4" />
              Solución
            </p>
            <p className="mt-1 whitespace-pre-line">{solucion}</p>
          </div>
        )}
        {error && (
          <p className="mt-4 text-sm text-error">
            No hemos podido cargar la solución. Inténtalo de nuevo.
          </p>
        )}
      </div>

      {!solucion && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {pistasVistas < pistas.length && (
            <Boton variante="secundario" onClick={() => setPistasVistas((n) => n + 1)}>
              <Lightbulb aria-hidden="true" className="size-4" />
              {pistasVistas === 0
                ? "Ver una pista"
                : `Ver otra pista (${pistasVistas + 1} de ${pistas.length})`}
            </Boton>
          )}
          {confirmar ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              ¿Seguro? Intentarlo tú mismo es la mejor forma de aprender.
              <Boton variante="primario" onClick={desbloquear} disabled={cargando}>
                {cargando ? "Cargando…" : "Sí, ver la solución"}
              </Boton>
              <Boton variante="enlace" onClick={() => setConfirmar(false)}>
                Lo intento otra vez
              </Boton>
            </span>
          ) : (
            <Boton variante="enlace" onClick={() => setConfirmar(true)}>
              Ver la solución
            </Boton>
          )}
        </div>
      )}
    </section>
  );
}
