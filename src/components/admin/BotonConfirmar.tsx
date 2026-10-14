"use client";

import { useState, type ReactNode } from "react";
import { Dialogo } from "@/components/ui/Dialogo";
import type { EstadoFormulario } from "@/lib/admin/formularios";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { useFormulario } from "./useFormulario";

interface Props {
  /** Acción del servidor que se ejecuta al confirmar */
  accion: (anterior: EstadoFormulario, formulario: FormData) => Promise<EstadoFormulario>;
  /** Datos que se envían a la acción (por ejemplo, { id: "…" }) */
  datos: Record<string, string>;
  /** Texto del botón que abre la ventana */
  children: ReactNode;
  titulo: string;
  /** Explicación de lo que va a pasar */
  texto: ReactNode;
  /** Texto del botón de confirmar (por defecto "Sí, borrar") */
  confirmar?: string;
  variante?: "peligro" | "secundario" | "suave" | "primario";
  pequeno?: boolean;
}

/**
 * Botón que pide confirmación antes de hacer algo que no se puede deshacer
 * (borrar, desactivar…). Si la acción no se puede hacer, explica por qué en la misma ventana.
 */
export function BotonConfirmar({
  accion,
  datos,
  children,
  titulo,
  texto,
  confirmar = "Sí, borrar",
  variante = "peligro",
  pequeno,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const { estado, alEnviar, enviando } = useFormulario(accion);
  // Respuesta que había al abrir la ventana: así solo cuentan las respuestas nuevas
  const [estadoAlAbrir, setEstadoAlAbrir] = useState<EstadoFormulario | null>(null);
  const respuestaNueva = estado !== estadoAlAbrir;
  // Si la acción ha ido bien, la ventana se cierra sola
  const visible = abierto && !(respuestaNueva && estado.ok);

  const abrir = () => {
    setEstadoAlAbrir(estado);
    setAbierto(true);
  };

  return (
    <>
      <BotonAdmin variante={variante} pequeno={pequeno} onClick={abrir}>
        {children}
      </BotonAdmin>
      <Dialogo
        abierto={visible}
        alCerrar={() => setAbierto(false)}
        titulo={titulo}
        className="max-w-md"
      >
        <form onSubmit={alEnviar} className="space-y-4 p-5 text-sm">
          {Object.entries(datos).map(([nombre, valor]) => (
            <input key={nombre} type="hidden" name={nombre} value={valor} />
          ))}
          <div className="leading-relaxed text-tinta/80">{texto}</div>
          {respuestaNueva && !estado.ok && estado.mensaje && (
            <Aviso tipo="error">{estado.mensaje}</Aviso>
          )}
          <div className="flex justify-end gap-2">
            <BotonAdmin variante="secundario" onClick={() => setAbierto(false)}>
              Cancelar
            </BotonAdmin>
            <BotonAdmin
              type="submit"
              variante={variante === "peligro" ? "peligro" : "primario"}
              disabled={enviando}
            >
              {enviando ? "Un momento…" : confirmar}
            </BotonAdmin>
          </div>
        </form>
      </Dialogo>
    </>
  );
}
