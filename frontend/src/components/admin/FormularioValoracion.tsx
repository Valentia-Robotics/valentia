"use client";

import { Save } from "lucide-react";
import { guardarValoracion } from "@/app/admin/acciones/acciones";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { CampoAdmin } from "./campos";
import { useFormulario } from "./useFormulario";

/** Escribir un valor nuevo de la empresa (el anterior queda en el historial) */
export function FormularioValoracion() {
  const { estado, alEnviar, enviando, error } = useFormulario(guardarValoracion);
  return (
    <form onSubmit={alEnviar} noValidate className="space-y-4">
      {!estado.ok && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
        <CampoAdmin
          etiqueta="Valor de la empresa (€)"
          name="importe"
          inputMode="decimal"
          placeholder="250.000"
          error={error("importe")}
        />
        <CampoAdmin
          etiqueta="¿De dónde sale? (opcional)"
          name="nota"
          maxLength={200}
          placeholder="Oferta de un inversor, valoración del gestor…"
          error={error("nota")}
        />
      </div>
      <div className="flex justify-end">
        <BotonAdmin type="submit" disabled={enviando}>
          <Save aria-hidden="true" className="size-4" />
          {enviando ? "Guardando…" : "Guardar valor"}
        </BotonAdmin>
      </div>
    </form>
  );
}
