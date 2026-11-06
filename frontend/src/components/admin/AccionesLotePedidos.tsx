"use client";

import { CheckCheck, PackageOpen, PackageCheck } from "lucide-react";
import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { cambiarVariosPedidos } from "@/app/admin/pedidos/acciones";
import { estadoInicial } from "@/lib/admin/formularios";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";

/** id del formulario: las casillas de cada fila de la tabla se unen a él con form="…" */
export const FORMULARIO_LOTE = "lote-pedidos";

/** Las casillas de las filas (están fuera del <form>, pero pertenecen a él) */
function casillas(): HTMLInputElement[] {
  const formulario = document.getElementById(FORMULARIO_LOTE) as HTMLFormElement | null;
  if (!formulario) return [];
  return [...formulario.elements].filter(
    (e): e is HTMLInputElement => e instanceof HTMLInputElement && e.name === "ids",
  );
}

/**
 * Barra encima de la lista de pedidos: marca varios con las casillas y pásalos
 * todos a «Preparando» o a «Entregado» con un solo clic.
 */
export function AccionesLotePedidos() {
  const [respuesta, despachar, enviando] = useActionState(cambiarVariosPedidos, estadoInicial);
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
    // El botón pulsado lleva el estado elegido (name="estado")
    const boton = (evento.nativeEvent as SubmitEvent).submitter;
    const datos = new FormData(evento.currentTarget, boton);
    startTransition(() => despachar(datos));
    // Ya están en "datos": se desmarcan para que no se cambien otra vez sin querer
    for (const c of casillas()) c.checked = false;
    setMarcados(0);
  };

  return (
    <form id={FORMULARIO_LOTE} onSubmit={alEnviar} className="mb-4 space-y-3">
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
        <BotonAdmin
          type="submit"
          name="estado"
          value="PREPARANDO"
          variante="secundario"
          pequeno
          disabled={enviando || marcados === 0}
        >
          <PackageOpen aria-hidden="true" className="size-4" />
          Pasar a «Preparando»
        </BotonAdmin>
        <BotonAdmin
          type="submit"
          name="estado"
          value="ENTREGADO"
          variante="secundario"
          pequeno
          disabled={enviando || marcados === 0}
        >
          <PackageCheck aria-hidden="true" className="size-4" />
          Pasar a «Entregado»
        </BotonAdmin>
      </div>
    </form>
  );
}
