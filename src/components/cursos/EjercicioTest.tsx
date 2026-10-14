"use client";

import { CircleCheck, CircleX, ListChecks } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { responderTest } from "@/app/(cuenta)/cursos/acciones";
import { Boton } from "@/components/ui/Boton";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  numero: number;
  enunciado: string;
  opciones: string[];
  /** Si ya lo respondió antes: su respuesta, la correcta y la explicación */
  previo: { respuesta: number; correcta: number; explicacion: string | null } | null;
}

interface Correccion {
  respuesta: number;
  correcta: number;
  explicacion: string | null;
}

/** Test de opción múltiple. Se corrige en el servidor y enseña la explicación. */
export function EjercicioTest({ id, numero, enunciado, opciones, previo }: Props) {
  const nombreGrupo = useId();
  const [elegida, setElegida] = useState<number | null>(previo?.respuesta ?? null);
  const [correccion, setCorreccion] = useState<Correccion | null>(previo);
  const [error, setError] = useState(false);
  const [comprobando, iniciar] = useTransition();

  function comprobar() {
    if (elegida === null) return;
    iniciar(async () => {
      const resultado = await responderTest(id, elegida);
      if (!resultado.ok) {
        setError(true);
        return;
      }
      setError(false);
      setCorreccion({
        respuesta: elegida,
        correcta: resultado.correcta,
        explicacion: resultado.explicacion,
      });
    });
  }

  function reintentar() {
    setCorreccion(null);
    setElegida(null);
  }

  const acertado = correccion !== null && correccion.respuesta === correccion.correcta;

  return (
    <section className="rounded-tarjeta bg-white p-6 ring-1 ring-linea">
      <p className="flex items-center gap-2 text-sm font-medium text-acento">
        <ListChecks aria-hidden="true" className="size-4" />
        Test {numero}
      </p>
      <fieldset className="mt-3" disabled={correccion !== null || comprobando}>
        <legend className="text-lg font-medium">{enunciado}</legend>
        <div className="mt-4 space-y-2">
          {opciones.map((opcion, i) => {
            const esCorrecta = correccion?.correcta === i;
            const esFallo = correccion !== null && correccion.respuesta === i && !esCorrecta;
            return (
              <label
                key={opcion}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-control p-3.5 ring-1 transition-colors",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento",
                  esCorrecta
                    ? "bg-exito/8 ring-exito"
                    : esFallo
                      ? "bg-error/8 ring-error"
                      : elegida === i
                        ? "bg-acento/5 ring-acento"
                        : "ring-linea hover:bg-niebla",
                  correccion !== null && "cursor-default",
                )}
              >
                <input
                  type="radio"
                  name={nombreGrupo}
                  value={i}
                  checked={elegida === i}
                  onChange={() => setElegida(i)}
                  className="size-4 accent-acento"
                />
                <span className="flex-1">{opcion}</span>
                {esCorrecta && <CircleCheck aria-label="Correcta" className="size-5 text-exito" />}
                {esFallo && <CircleX aria-label="Incorrecta" className="size-5 text-error" />}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Corrección (se anuncia a los lectores de pantalla) */}
      <div aria-live="polite">
        {correccion && (
          <div
            className={cn(
              "mt-4 rounded-control p-4 text-sm",
              acertado ? "bg-exito/8" : "bg-aviso/8",
            )}
          >
            <p className={cn("font-medium", acertado ? "text-exito" : "text-aviso")}>
              {acertado
                ? "¡Correcto! Muy bien."
                : "Casi. La respuesta correcta está marcada en verde."}
            </p>
            {correccion.explicacion && <p className="mt-1">{correccion.explicacion}</p>}
          </div>
        )}
        {error && (
          <p className="mt-4 text-sm text-error">No hemos podido corregirlo. Inténtalo de nuevo.</p>
        )}
      </div>

      <div className="mt-5">
        {correccion ? (
          <Boton variante="secundario" onClick={reintentar}>
            Intentar de nuevo
          </Boton>
        ) : (
          <Boton variante="acento" onClick={comprobar} disabled={elegida === null || comprobando}>
            {comprobando ? "Comprobando…" : "Comprobar"}
          </Boton>
        )}
      </div>
    </section>
  );
}
