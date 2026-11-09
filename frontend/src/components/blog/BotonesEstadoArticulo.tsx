"use client";

import { cambiarEstadoArticulo } from "@/app/admin/blog/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { AreaAdmin } from "@/components/admin/campos";
import { useFormulario } from "@/components/admin/useFormulario";
import type { EstadoArticulo } from "@/generated/prisma/enums";

/** Lo que el admin puede hacer con un artículo según su estado */
export function BotonesEstadoArticulo({
  articuloId,
  estado,
}: {
  articuloId: string;
  estado: EstadoArticulo;
}) {
  const datos = (accion: string) => ({ articuloId, accion });
  return (
    <div className="space-y-3">
      {estado !== "PUBLICADO" && (
        <BotonConfirmar
          accion={cambiarEstadoArticulo}
          datos={datos("publicar")}
          titulo="Publicar ahora"
          texto="Sale ya en el blog y en el sitemap, se avisa a Bing y n8n recibe el aviso."
          confirmar="Sí, publicar"
          variante="primario"
        >
          Publicar ahora
        </BotonConfirmar>
      )}
      {(estado === "PENDIENTE" || estado === "RECHAZADO") && (
        <BotonConfirmar
          accion={cambiarEstadoArticulo}
          datos={datos("cola")}
          titulo="Poner en la cola"
          texto="Saldrá solo, en su turno, a la hora configurada (si la publicación automática está encendida)."
          confirmar="Sí, a la cola"
          variante="secundario"
        >
          Poner en la cola
        </BotonConfirmar>
      )}
      {estado === "PUBLICADO" && (
        <BotonConfirmar
          accion={cambiarEstadoArticulo}
          datos={datos("despublicar")}
          titulo="Despublicar"
          texto="Desaparece del blog y vuelve a «Pendiente». Podrás publicarlo otra vez."
          confirmar="Sí, despublicar"
          variante="peligro"
        >
          Despublicar
        </BotonConfirmar>
      )}
      {estado !== "RECHAZADO" && <FormularioRechazar articuloId={articuloId} />}
    </div>
  );
}

function FormularioRechazar({ articuloId }: { articuloId: string }) {
  const { estado, alEnviar, enviando } = useFormulario(cambiarEstadoArticulo);
  return (
    <details className="rounded-lg bg-niebla p-3">
      <summary className="cursor-pointer text-sm font-medium">Rechazar…</summary>
      <form onSubmit={alEnviar} className="mt-3 space-y-3">
        {estado.mensaje && !estado.ok && <Aviso tipo="error">{estado.mensaje}</Aviso>}
        <input type="hidden" name="articuloId" value={articuloId} />
        <input type="hidden" name="accion" value="rechazar" />
        <AreaAdmin etiqueta="Motivo (opcional)" name="motivo" rows={2} />
        <BotonAdmin type="submit" variante="peligro" disabled={enviando}>
          {enviando ? "Rechazando…" : "Rechazar"}
        </BotonAdmin>
      </form>
    </details>
  );
}
