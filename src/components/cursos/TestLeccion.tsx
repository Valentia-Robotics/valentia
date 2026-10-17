"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { corregirTest, type CorreccionTest } from "@/app/(cuenta)/cursos/acciones";
import { Boton } from "@/components/ui/Boton";
import { cn } from "@/lib/utils";

interface Pregunta {
  id: string;
  enunciado: string;
  opciones: string[];
}

interface Props {
  leccionId: string;
  preguntas: Pregunta[];
  /** Vuelve al vídeo de la lección */
  urlVideo: string;
  siguiente: { titulo: string; url: string } | null;
}

type Resultado = Extract<CorreccionTest, { ok: true }>;

/**
 * El test de una lección, pregunta a pregunta. Al final lo corrige el servidor
 * (las respuestas correctas no están en el navegador) y enseña la puntuación,
 * la explicación de cada respuesta y los botones para repetir o volver al vídeo.
 */
export function TestLeccion({ leccionId, preguntas, urlVideo, siguiente }: Props) {
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState<(number | null)[]>(() => preguntas.map(() => null));
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [corrigiendo, iniciar] = useTransition();
  const titulo = useRef<HTMLHeadingElement>(null);
  const nombreGrupo = useId();
  const primeraVez = useRef(true);

  // Al cambiar de pregunta (o al ver el resultado), el foco va al título: lo anuncian los lectores de pantalla
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    titulo.current?.focus();
  }, [indice, resultado]);

  const pregunta = preguntas[indice];
  const elegida = respuestas[indice];
  const ultima = indice === preguntas.length - 1;

  function elegir(opcion: number) {
    setRespuestas((anteriores) => anteriores.map((r, i) => (i === indice ? opcion : r)));
  }

  function avanzar() {
    if (elegida === null) return;
    if (!ultima) {
      setIndice(indice + 1);
      return;
    }
    iniciar(async () => {
      const correccion = await corregirTest(leccionId, respuestas as number[]);
      if (correccion.ok) {
        setError(null);
        setResultado(correccion);
      } else {
        setError(correccion.mensaje);
      }
    });
  }

  function repetir() {
    setRespuestas(preguntas.map(() => null));
    setIndice(0);
    setResultado(null);
  }

  // ---------- Resultado ----------
  if (resultado) {
    const { aciertos, total, mejorAciertos, aprobado, correcciones } = resultado;
    const todo = aciertos === total;
    return (
      <div className="mt-8">
        <section
          aria-labelledby="titulo-resultado"
          className={cn("rounded-tarjeta p-8 text-center", aprobado ? "bg-exito/8" : "bg-aviso/8")}
        >
          <h2
            id="titulo-resultado"
            ref={titulo}
            tabIndex={-1}
            className="text-2xl font-medium outline-none"
          >
            {todo ? "¡Perfecto!" : aprobado ? "¡Aprobado!" : "¡Casi lo tienes!"}
          </h2>
          <p className="mt-3 font-titulo text-6xl font-medium tabular-nums">
            {aciertos}
            <span className="text-3xl text-gris"> / {total}</span>
          </p>
          <p className="mt-2 text-gris">
            {todo
              ? "Has acertado todas. Lo has entendido de maravilla."
              : aprobado
                ? "Has superado el test y la lección queda completada."
                : "Repasa el vídeo y vuelve a intentarlo: necesitas acertar la mitad."}
            {mejorAciertos > aciertos &&
              ` Tu mejor resultado sigue siendo ${mejorAciertos} de ${total}.`}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {aprobado && siguiente ? (
              <Boton href={siguiente.url} variante="acento" tamano="lg">
                Siguiente lección
                <ChevronRight aria-hidden="true" className="size-4" />
              </Boton>
            ) : null}
            <Boton onClick={repetir} variante={aprobado ? "secundario" : "acento"} tamano="lg">
              <RotateCcw aria-hidden="true" className="size-4" />
              Repetir el test
            </Boton>
            <Boton href={urlVideo} variante="secundario" tamano="lg">
              <PlayCircle aria-hidden="true" className="size-4" />
              Volver a ver el vídeo
            </Boton>
          </div>
        </section>

        <h3 className="mt-12 text-2xl font-medium">Tus respuestas</h3>
        <ol className="mt-4 space-y-4">
          {preguntas.map((p, i) => {
            const { correcta, explicacion } = correcciones[i];
            const suya = respuestas[i];
            const acierto = suya === correcta;
            return (
              <li key={p.id} className="rounded-tarjeta bg-white p-5 ring-1 ring-linea">
                <p className="flex items-start gap-2 font-medium">
                  {acierto ? (
                    <CircleCheck
                      aria-label="Correcta"
                      className="mt-0.5 size-5 shrink-0 text-exito"
                    />
                  ) : (
                    <CircleX
                      aria-label="Incorrecta"
                      className="mt-0.5 size-5 shrink-0 text-error"
                    />
                  )}
                  <span>
                    {i + 1}. {p.enunciado}
                  </span>
                </p>
                <p className="mt-3 text-sm">
                  <span className="text-gris">Tu respuesta: </span>
                  <span className={acierto ? "text-exito" : "text-error-oscuro"}>
                    {suya !== null ? p.opciones[suya] : "—"}
                  </span>
                </p>
                {!acierto && (
                  <p className="mt-1 text-sm">
                    <span className="text-gris">Respuesta correcta: </span>
                    <span className="text-exito">{p.opciones[correcta]}</span>
                  </p>
                )}
                {explicacion && (
                  <p className="mt-3 rounded-control bg-niebla p-3 text-sm">{explicacion}</p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  // ---------- Pregunta ----------
  const porcentaje = Math.round((indice / preguntas.length) * 100);
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between text-sm text-gris">
        <span>
          Pregunta {indice + 1} de {preguntas.length}
        </span>
        <span className="tabular-nums">{porcentaje} %</span>
      </div>
      <div
        role="progressbar"
        aria-label="Avance del test"
        aria-valuemin={0}
        aria-valuemax={preguntas.length}
        aria-valuenow={indice}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-niebla"
      >
        <div
          className="h-full rounded-full bg-acento transition-[width] duration-500"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      <fieldset key={pregunta.id} className="mt-8 animate-entrada" disabled={corrigiendo}>
        <legend className="w-full">
          <h2 ref={titulo} tabIndex={-1} className="text-2xl font-medium outline-none sm:text-3xl">
            {pregunta.enunciado}
          </h2>
        </legend>
        <div className="mt-6 space-y-3">
          {pregunta.opciones.map((opcion, i) => (
            <label
              key={opcion}
              className={cn(
                "flex cursor-pointer items-center gap-4 rounded-control p-4 text-lg ring-1 transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento",
                elegida === i ? "bg-acento/5 ring-2 ring-acento" : "ring-linea hover:bg-niebla",
              )}
            >
              <input
                type="radio"
                name={nombreGrupo}
                value={i}
                checked={elegida === i}
                onChange={() => elegir(i)}
                className="size-5 accent-acento"
              />
              <span className="flex-1">{opcion}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-5 rounded-control bg-error/8 p-4 text-sm text-error-oscuro">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        {indice > 0 ? (
          <Boton variante="secundario" tamano="lg" onClick={() => setIndice(indice - 1)}>
            <ChevronLeft aria-hidden="true" className="size-4" />
            Anterior
          </Boton>
        ) : (
          <span />
        )}
        <Boton
          variante="acento"
          tamano="lg"
          onClick={avanzar}
          disabled={elegida === null || corrigiendo}
        >
          {corrigiendo ? "Corrigiendo…" : ultima ? "Ver mi resultado" : "Siguiente"}
          {!ultima && <ChevronRight aria-hidden="true" className="size-4" />}
        </Boton>
      </div>
    </div>
  );
}
