"use client";

import {
  asignarEditor,
  cambiarEstadoDeGuion,
  crearCategoria,
} from "@/app/admin/contenido/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { AreaAdmin, CampoAdmin, SelectorAdmin } from "@/components/admin/campos";
import { useFormulario } from "@/components/admin/useFormulario";

/** Elegir el editor de un guion aprobado, o pasárselo a otro */
export function FormularioAsignar({
  guionId,
  editores,
  reasignar,
  sugerido,
}: {
  guionId: string;
  editores: { id: string; nombre: string; email: string }[];
  reasignar: boolean;
  /** Quien propuso la idea: sale ya elegido */
  sugerido?: string;
}) {
  const { estado, alEnviar, enviando, error } = useFormulario(asignarEditor);

  if (editores.length === 0) {
    return (
      <Aviso tipo="info">
        Todavía no hay editores. Da el rol a una cuenta desde la sección Usuarios.
      </Aviso>
    );
  }
  return (
    <form onSubmit={alEnviar} noValidate className="space-y-3">
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      <input type="hidden" name="guionId" value={guionId} />
      <SelectorAdmin
        etiqueta={reasignar ? "Pasar a otro editor" : "Editor"}
        name="editorId"
        defaultValue={sugerido && editores.some((e) => e.id === sugerido) ? sugerido : ""}
        error={error("editorId")}
        opciones={[
          { valor: "", texto: "Elige un editor…" },
          ...editores.map((e) => ({ valor: e.id, texto: `${e.nombre} (${e.email})` })),
        ]}
      />
      <BotonAdmin
        type="submit"
        variante={reasignar ? "secundario" : "primario"}
        disabled={enviando}
      >
        {enviando ? "Asignando…" : reasignar ? "Reasignar" : "Asignar"}
      </BotonAdmin>
    </form>
  );
}

/** Devolver una entrega a «en progreso», explicando qué hay que cambiar */
export function FormularioDevolver({ guionId }: { guionId: string }) {
  const { estado, alEnviar, enviando } = useFormulario(cambiarEstadoDeGuion);

  return (
    <form onSubmit={alEnviar} className="space-y-3">
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      <input type="hidden" name="guionId" value={guionId} />
      <input type="hidden" name="a" value="EN_PROGRESO" />
      <AreaAdmin etiqueta="Comentario de cambios" name="comentario" rows={3} />
      <BotonAdmin type="submit" variante="secundario" disabled={enviando}>
        {enviando ? "Devolviendo…" : "Devolver con comentarios"}
      </BotonAdmin>
    </form>
  );
}

/** Añadir una categoría a la lista */
export function FormularioCategoria() {
  const { estado, alEnviar, enviando, error } = useFormulario(crearCategoria);

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-3">
      {!estado.ok && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <CampoAdmin etiqueta="Nueva categoría" name="nombre" error={error("nombre")} />
        <BotonAdmin type="submit" disabled={enviando} className="sm:mt-6">
          {enviando ? "Añadiendo…" : "Añadir"}
        </BotonAdmin>
      </div>
      <p className="text-xs text-gris">Siempre sobre tecnología y robótica.</p>
    </form>
  );
}
