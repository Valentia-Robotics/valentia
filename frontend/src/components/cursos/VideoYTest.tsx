"use client";

import { CircleCheck, ListChecks, Lock } from "lucide-react";
import { useState } from "react";
import { marcarVideoVisto } from "@/app/(cuenta)/cursos/acciones";
import { Boton } from "@/components/ui/Boton";
import { fuenteVideo } from "@/lib/video";
import { plural } from "@/lib/utils";
import { ReproductorVideo } from "./ReproductorVideo";

interface Props {
  leccionId: string;
  /** Dirección de la pantalla del test */
  urlTest: string;
  videoUrl: string;
  titulo: string;
  /** Número de preguntas del test (0 = la lección no tiene test) */
  preguntas: number;
  videoVisto: boolean;
  resultado: { aciertos: number; total: number; mejorAciertos: number; intentos: number } | null;
}

/**
 * Vídeo de la lección y, debajo, el acceso al test.
 * «Hacer el test» se desbloquea cuando el vídeo llega al final (lo detecta ReproductorVideo
 * con la API oficial de cada servicio) y se guarda para la próxima vez.
 */
export function VideoYTest({
  leccionId,
  urlTest,
  videoUrl,
  titulo,
  preguntas,
  videoVisto,
  resultado,
}: Props) {
  const fuente = fuenteVideo(videoUrl);
  const [visto, setVisto] = useState(videoVisto);
  const [sinDetector, setSinDetector] = useState(false);
  const desbloqueado = visto || fuente.tipo === "pendiente";

  function alTerminar() {
    if (visto) return;
    setVisto(true);
    void marcarVideoVisto(leccionId);
  }

  return (
    <>
      <div id="video" className="scroll-mt-24">
        <ReproductorVideo
          fuente={fuente}
          titulo={titulo}
          alTerminar={alTerminar}
          sinDetector={() => setSinDetector(true)}
        />
      </div>

      {preguntas > 0 && (
        <section
          aria-labelledby="titulo-test"
          className="mt-6 flex flex-col gap-4 rounded-tarjeta bg-niebla p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-acento">
              <ListChecks aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 id="titulo-test" className="font-sans text-base font-semibold">
                Test de la lección · {plural(preguntas, "pregunta", "preguntas")}
              </h2>
              {/* aria-live: se anuncia cuando el test se desbloquea */}
              <p aria-live="polite" className="text-sm text-gris">
                {resultado ? (
                  <>
                    Último resultado: {resultado.aciertos} de {resultado.total} · Mejor:{" "}
                    {resultado.mejorAciertos} de {resultado.total}
                  </>
                ) : desbloqueado ? (
                  fuente.tipo === "pendiente" ? (
                    "El vídeo aún no está listo, pero ya puedes ponerte a prueba."
                  ) : (
                    <span className="inline-flex items-center gap-1 text-exito">
                      <CircleCheck aria-hidden="true" className="size-4" />
                      ¡Vídeo terminado! Ya puedes hacer el test.
                    </span>
                  )
                ) : (
                  "Se desbloquea cuando termines de ver el vídeo."
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {desbloqueado ? (
              <Boton href={urlTest} variante="acento" tamano="lg">
                {resultado ? "Repetir el test" : "Hacer el test"}
              </Boton>
            ) : (
              <Boton variante="primario" tamano="lg" disabled aria-describedby="titulo-test">
                <Lock aria-hidden="true" className="size-4" />
                Hacer el test
              </Boton>
            )}
            {/* Si no podemos saber cuándo acaba el vídeo (API bloqueada), no dejamos a nadie atascado */}
            {!desbloqueado && sinDetector && (
              <button
                type="button"
                onClick={alTerminar}
                className="text-sm text-acento underline underline-offset-4"
              >
                He terminado el vídeo
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
