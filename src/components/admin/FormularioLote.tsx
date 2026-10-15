"use client";

import { QrCode } from "lucide-react";
import { generarLote } from "@/app/admin/codigos/acciones";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { CampoAdmin, SelectorAdmin } from "./campos";
import { useFormulario } from "./useFormulario";

/** Generar de una vez los códigos de un kit (por ejemplo, 50 para una tirada de cajas) */
export function FormularioLote({
  kits,
  kitInicial,
  maximo,
}: {
  kits: { id: string; nombre: string }[];
  kitInicial?: string;
  maximo: number;
}) {
  const { estado, alEnviar, enviando, error } = useFormulario(generarLote);

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-3">
      {!estado.ok && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-start">
        <SelectorAdmin
          etiqueta="Kit"
          name="kitId"
          defaultValue={kitInicial ?? ""}
          error={error("kitId")}
          opciones={[
            { valor: "", texto: "Elige un kit…" },
            ...kits.map((k) => ({ valor: k.id, texto: k.nombre })),
          ]}
        />
        <CampoAdmin
          etiqueta="Cantidad"
          name="cantidad"
          inputMode="numeric"
          defaultValue="50"
          error={error("cantidad")}
          ayuda={`De 1 a ${maximo}`}
        />
        <BotonAdmin type="submit" disabled={enviando} className="sm:mt-6">
          <QrCode aria-hidden="true" className="size-4" />
          {enviando ? "Generando…" : "Generar códigos"}
        </BotonAdmin>
      </div>
      <p className="text-xs text-gris">
        Al generarlos se abre la página con las tarjetas QR, lista para imprimir.
      </p>
    </form>
  );
}
