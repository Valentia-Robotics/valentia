"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { MarcoWeb } from "@/components/layout/MarcoWeb";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";

/**
 * PÁGINA DE ERROR (500): si algo falla al pintar una página.
 * Nunca enseña el error real (podría revelar información interna): solo un mensaje amable y,
 * para poder buscarlo en los registros del servidor, su referencia ("digest").
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error); // queda en la consola del navegador, no en la página
  }, [error]);

  return (
    <MarcoWeb>
      <Contenedor className="flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-acento">Error 500</p>
        <h1 className="mt-3 text-4xl font-medium sm:text-5xl">Se nos ha cruzado un cable</h1>
        <p className="mt-4 max-w-md text-lg text-gris">
          Algo ha fallado por nuestra parte. Vuelve a intentarlo en un momento; si sigue pasando,
          escríbenos y lo arreglamos.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-gris">
            Referencia del error: <span className="font-mono">{error.digest}</span>
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Boton onClick={reset} tamano="lg">
            <RotateCcw aria-hidden="true" className="size-4" />
            Reintentar
          </Boton>
          <Boton href="/" variante="secundario" tamano="lg">
            Volver al inicio
          </Boton>
        </div>
      </Contenedor>
    </MarcoWeb>
  );
}
