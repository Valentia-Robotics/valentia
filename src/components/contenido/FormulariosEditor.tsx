"use client";

import { entregarGuion, guardarNotas } from "@/app/editor/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { AreaAdmin, CampoAdmin } from "@/components/admin/campos";
import { useFormulario } from "@/components/admin/useFormulario";

/** Zona de trabajo del editor: sus notas o su versión adaptada (el guion aprobado no cambia) */
export function FormularioNotas({ guionId, notas }: { guionId: string; notas: string | null }) {
  const { estado, alEnviar, enviando } = useFormulario(guardarNotas);

  return (
    <form onSubmit={alEnviar} className="space-y-3">
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      <input type="hidden" name="guionId" value={guionId} />
      <AreaAdmin
        etiqueta="Tus notas o tu versión adaptada"
        name="notasEditor"
        rows={8}
        defaultValue={notas ?? ""}
      />
      <BotonAdmin type="submit" variante="secundario" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar notas"}
      </BotonAdmin>
    </form>
  );
}

/** Entregar: pegar el enlace del vídeo terminado */
export function FormularioEntrega({ guionId, enlace }: { guionId: string; enlace: string | null }) {
  const { estado, alEnviar, enviando, error } = useFormulario(entregarGuion);

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-3">
      {!estado.ok && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      <input type="hidden" name="guionId" value={guionId} />
      <CampoAdmin
        etiqueta="Enlace del vídeo terminado"
        name="enlaceVideo"
        type="url"
        inputMode="url"
        placeholder="https://…"
        defaultValue={enlace ?? ""}
        ayuda="Drive, YouTube o donde lo tengas"
        error={error("enlaceVideo")}
      />
      <BotonAdmin type="submit" disabled={enviando}>
        {enviando ? "Entregando…" : "Entregar"}
      </BotonAdmin>
    </form>
  );
}
