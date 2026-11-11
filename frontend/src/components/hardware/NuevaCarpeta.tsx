"use client";

import { useState } from "react";
import type { EstadoFormulario } from "@/lib/admin/formularios";
import { FolderPlus } from "lucide-react";
import { crearCarpetaHardware } from "@/app/hardware/acciones";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { useFormulario } from "@/components/admin/useFormulario";

/**
 * «Nueva carpeta» del explorador de hardware: crea una carpeta (vacía) dentro de la que está
 * abierta. Se queda guardada aunque no tenga archivos. `duenoId` solo lo usa un administrador.
 */
export function NuevaCarpeta({ duenoId, dentro }: { duenoId?: string; dentro: string }) {
  const [abierto, setAbierto] = useState(false);
  const { estado, alEnviar, enviando } = useFormulario(crearCarpetaHardware);
  // Respuesta que había al abrir: solo cuentan las nuevas (al crearla bien, se cierra solo)
  const [estadoAlAbrir, setEstadoAlAbrir] = useState<EstadoFormulario | null>(null);
  const respuestaNueva = estado !== estadoAlAbrir;

  if (!abierto || (respuestaNueva && estado.ok)) {
    return (
      <BotonAdmin
        variante="secundario"
        pequeno
        onClick={() => {
          setEstadoAlAbrir(estado);
          setAbierto(true);
        }}
      >
        <FolderPlus aria-hidden="true" className="size-4" />
        Nueva carpeta
      </BotonAdmin>
    );
  }
  return (
    <form onSubmit={alEnviar} className="flex flex-wrap items-center gap-2">
      {duenoId && <input type="hidden" name="duenoId" value={duenoId} />}
      <input type="hidden" name="dentro" value={dentro} />
      <input
        autoFocus
        name="nombre"
        aria-label="Nombre de la carpeta nueva"
        placeholder="Nombre de la carpeta"
        maxLength={120}
        required
        disabled={enviando}
        onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}
        className="h-8 w-48 rounded-md border border-linea bg-white px-2.5 text-sm focus:border-acento focus:outline-none"
      />
      <BotonAdmin type="submit" pequeno disabled={enviando}>
        {enviando ? "Creando…" : "Crear"}
      </BotonAdmin>
      <BotonAdmin variante="suave" pequeno onClick={() => setAbierto(false)}>
        Cancelar
      </BotonAdmin>
      {respuestaNueva && !estado.ok && estado.mensaje && (
        <p role="alert" className="w-full text-xs text-error-oscuro">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
