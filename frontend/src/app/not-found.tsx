import type { Metadata } from "next";
import { MarcoWeb } from "@/components/layout/MarcoWeb";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/** Se muestra cuando una dirección no existe (o todavía no está construida). */
export default function NoEncontrada() {
  return (
    <MarcoWeb>
      <Contenedor className="flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-acento">Error 404</p>
        <h1 className="mt-3 text-4xl font-medium sm:text-5xl">Esta página no existe</h1>
        <p className="mt-4 max-w-md text-lg text-gris">
          Puede que la dirección esté mal escrita o que la página ya no esté. Desde el inicio llegas
          a todo lo demás.
        </p>
        <Boton href="/" tamano="lg" className="mt-8">
          Volver al inicio
        </Boton>
      </Contenedor>
    </MarcoWeb>
  );
}
