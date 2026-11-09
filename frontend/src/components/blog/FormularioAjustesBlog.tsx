"use client";

import { guardarAjustesBlog } from "@/app/admin/blog/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { CampoAdmin, CasillaAdmin } from "@/components/admin/campos";
import { useFormulario } from "@/components/admin/useFormulario";

/** Interruptor de publicación automática, artículos al día y hora (de Madrid) */
export function FormularioAjustesBlog({
  ajustes,
}: {
  ajustes: { autoPublicar: boolean; porDia: number; hora: string };
}) {
  const { estado, alEnviar, enviando, error } = useFormulario(guardarAjustesBlog);
  return (
    <form onSubmit={alEnviar} noValidate className="space-y-4">
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      <CasillaAdmin
        etiqueta="Publicación automática"
        name="autoPublicar"
        defaultChecked={ajustes.autoPublicar}
        ayuda="Encendida: lo que manda n8n y pasa los filtros se publica solo, a su hora. Apagada: todo espera a que lo apruebes."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoAdmin
          etiqueta="Artículos al día"
          name="porDia"
          type="number"
          min={1}
          max={10}
          defaultValue={ajustes.porDia}
          error={error("porDia")}
        />
        <CampoAdmin
          etiqueta="Hora de publicación (Madrid)"
          name="hora"
          type="time"
          defaultValue={ajustes.hora}
          error={error("hora")}
        />
      </div>
      <BotonAdmin type="submit" variante="secundario" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar ajustes"}
      </BotonAdmin>
    </form>
  );
}
