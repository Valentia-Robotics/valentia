"use client";

import { Printer } from "lucide-react";
import { BotonAdmin } from "./BotonAdmin";

/** Abre el diálogo de impresión del navegador (con el estilo del panel) */
export function BotonImprimirAdmin({ texto }: { texto: string }) {
  return (
    <BotonAdmin onClick={() => window.print()}>
      <Printer aria-hidden="true" className="size-4" />
      {texto}
    </BotonAdmin>
  );
}
