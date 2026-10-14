"use client";

import { Printer } from "lucide-react";
import { Boton } from "@/components/ui/Boton";

/** Abre el diálogo de impresión del navegador (solo se imprimen las tarjetas). */
export function BotonImprimir({ texto = "Imprimir tarjetas" }: { texto?: string }) {
  return (
    <Boton
      variante="secundario"
      tamano="lg"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer aria-hidden="true" className="size-5" strokeWidth={1.8} />
      {texto}
    </Boton>
  );
}
