"use client";

import { useFormStatus } from "react-dom";
import { Gift } from "lucide-react";
import { Boton } from "@/components/ui/Boton";

/** Botón de la ficha de un kit gratis. Va dentro del formulario que llama a conseguirKitGratis. */
export function BotonKitGratis() {
  const { pending } = useFormStatus();
  return (
    <Boton
      type="submit"
      variante="acento"
      tamano="lg"
      disabled={pending}
      className="w-full sm:w-auto"
    >
      <Gift aria-hidden="true" className="size-5" strokeWidth={1.8} />
      {pending ? "Activando…" : "Conseguir gratis"}
    </Boton>
  );
}
