"use client";

import { useState } from "react";
import { guardarGuion } from "@/app/admin/contenido/acciones";
import { guardarIdea } from "@/app/editor/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { AreaAdmin, CampoAdmin, SelectorAdmin } from "@/components/admin/campos";
import { useFormulario } from "@/components/admin/useFormulario";
import { plataformasGuion } from "@/config/estadosGuion";

interface Guion {
  id: string;
  titulo: string;
  categoriaId: string;
  plataforma: string;
  plataformaOtra: string | null;
  duracionObjetivo: string;
  gancho: string;
  desarrollo: string;
  llamadaAccion: string;
  notasVisuales: string;
  kitId: string | null;
  fechaLimite: Date;
}

/**
 * Crear o corregir un guion: administración (antes de aprobarlo) o un editor con sus ideas propias
 * (`idea`, mientras son borrador).
 */
export function FormularioGuion({
  guion,
  categorias,
  kits,
  idea = false,
}: {
  guion?: Guion;
  categorias: { id: string; nombre: string }[];
  kits: { id: string; nombre: string }[];
  idea?: boolean;
}) {
  const { estado, alEnviar, enviando, error } = useFormulario(idea ? guardarIdea : guardarGuion);
  const [plataforma, setPlataforma] = useState(guion?.plataforma ?? "");

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-4">
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      {guion && <input type="hidden" name="guionId" value={guion.id} />}

      <CampoAdmin
        etiqueta="Título"
        name="titulo"
        defaultValue={guion?.titulo}
        error={error("titulo")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectorAdmin
          etiqueta="Categoría"
          name="categoriaId"
          defaultValue={guion?.categoriaId ?? ""}
          error={error("categoriaId")}
          opciones={[
            { valor: "", texto: "Elige una categoría…" },
            ...categorias.map((c) => ({ valor: c.id, texto: c.nombre })),
          ]}
        />
        <SelectorAdmin
          etiqueta="Plataforma destino"
          name="plataforma"
          value={plataforma}
          onChange={(evento) => setPlataforma(evento.target.value)}
          error={error("plataforma")}
          opciones={[
            { valor: "", texto: "Elige una plataforma…" },
            ...Object.entries(plataformasGuion).map(([valor, texto]) => ({ valor, texto })),
          ]}
        />
        {plataforma === "OTRA" && (
          <CampoAdmin
            etiqueta="¿Qué plataforma?"
            name="plataformaOtra"
            defaultValue={guion?.plataformaOtra ?? ""}
            error={error("plataformaOtra")}
          />
        )}
        <CampoAdmin
          etiqueta="Duración objetivo"
          name="duracionObjetivo"
          placeholder="45 segundos"
          defaultValue={guion?.duracionObjetivo}
          error={error("duracionObjetivo")}
        />
        <CampoAdmin
          etiqueta="Fecha límite"
          name="fechaLimite"
          type="date"
          defaultValue={guion?.fechaLimite.toISOString().slice(0, 10)}
          error={error("fechaLimite")}
        />
        <SelectorAdmin
          etiqueta="Kit de Valentia relacionado (opcional)"
          name="kitId"
          defaultValue={guion?.kitId ?? ""}
          error={error("kitId")}
          opciones={[
            { valor: "", texto: "Ninguno" },
            ...kits.map((k) => ({ valor: k.id, texto: k.nombre })),
          ]}
        />
      </div>
      <AreaAdmin
        etiqueta="Gancho (primeros 3 segundos)"
        name="gancho"
        rows={2}
        defaultValue={guion?.gancho}
        error={error("gancho")}
      />
      <AreaAdmin
        etiqueta="Desarrollo"
        name="desarrollo"
        rows={8}
        defaultValue={guion?.desarrollo}
        error={error("desarrollo")}
      />
      <AreaAdmin
        etiqueta="Llamada a la acción"
        name="llamadaAccion"
        rows={2}
        defaultValue={guion?.llamadaAccion}
        error={error("llamadaAccion")}
      />
      <AreaAdmin
        etiqueta="Notas visuales para la edición"
        name="notasVisuales"
        defaultValue={guion?.notasVisuales}
        error={error("notasVisuales")}
      />
      <BotonAdmin type="submit" disabled={enviando}>
        {enviando
          ? "Guardando…"
          : guion
            ? "Guardar cambios"
            : idea
              ? "Guardar idea"
              : "Crear guion"}
      </BotonAdmin>
    </form>
  );
}
