"use client";

import { CheckCheck, Trash2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { borrarVariosCodigos } from "@/app/admin/codigos/acciones";
import { estadoInicial } from "@/lib/admin/formularios";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";

/** id del formulario: las casillas de cada fila de la tabla se unen a él con form="…" */
export const FORMULARIO_LOTE_CODIGOS = "lote-codigos";

/** Las casillas de las filas (están fuera del <form>, pero pertenecen a él) */
function casillas(): HTMLInputElement[] {
  const formulario = document.getElementById(FORMULARIO_LOTE_CODIGOS) as HTMLFormElement | null;
  if (!formulario) return [];
  return [...formulario.elements].filter(
    (e): e is HTMLInputElement => e instanceof HTMLInputElement && e.name === "ids",
  );
}

/**
 * Barra encima de la lista de códigos: marca varios con las casillas y bórralos de una vez.
 * Solo llevan casilla los códigos que nadie ha usado y que no se vendieron en un pedido.
 */
export function AccionesLoteCodigos() {
  const [respuesta, despachar, enviando] = useActionState(borrarVariosCodigos, estadoInicial);
  const [marcados, setMarcados] = useState(0);

  // Cuenta las casillas marcadas cada vez que cambia una
  useEffect(() => {
    const contar = () => setMarcados(casillas().filter((c) => c.checked).length);
    document.addEventListener("change", contar);
    return () => document.removeEventListener("change", contar);
  }, []);

  const marcarTodas = () => {
    const todas = casillas();
    const valor = todas.some((c) => !c.checked);
    for (const c of todas) c.checked = valor;
    setMarcados(valor ? todas.length : 0);
  };

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const cuantos = marcados === 1 ? "1 código" : `${marcados} códigos`;
    if (
      !window.confirm(
        `¿Borrar ${cuantos}? Desaparecen de la lista y dejan de contar en su kit. Si ya los imprimiste, esas tarjetas dejarán de funcionar. No se puede deshacer.`,
      )
    ) {
      return;
    }
    startTransition(() => despachar(datos));
    // Ya están en "datos": se desmarcan para que no se repita sin querer
    for (const c of casillas()) c.checked = false;
    setMarcados(0);
  };

  return (
    <form id={FORMULARIO_LOTE_CODIGOS} onSubmit={alEnviar} className="space-y-2">
      {respuesta.mensaje && (
        <Aviso tipo={respuesta.ok ? "exito" : "error"}>{respuesta.mensaje}</Aviso>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <BotonAdmin variante="secundario" pequeno onClick={marcarTodas}>
          <CheckCheck aria-hidden="true" className="size-4" />
          Marcar todos
        </BotonAdmin>
        <span className="px-1 text-gris tabular-nums" aria-live="polite">
          {marcados === 1 ? "1 seleccionado" : `${marcados} seleccionados`}
        </span>
        <BotonAdmin type="submit" variante="peligro" pequeno disabled={enviando || marcados === 0}>
          <Trash2 aria-hidden="true" className="size-4" />
          Borrar seleccionados
        </BotonAdmin>
      </div>
    </form>
  );
}
