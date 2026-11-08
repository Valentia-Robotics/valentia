"use client";

import { Ban, CheckCheck, RotateCcw } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { cambiarDesactivacionSeleccionados } from "@/app/admin/codigos/acciones";
import { Dialogo } from "@/components/ui/Dialogo";
import { estadoInicial } from "@/lib/admin/formularios";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";

/** id del formulario: las casillas de cada fila de la tabla se unen a él con form="…" */
export const FORMULARIO_CODIGOS = "seleccion-codigos";

/** Las casillas de las filas (están fuera del <form>, pero pertenecen a él), en orden */
function casillas(): HTMLInputElement[] {
  const formulario = document.getElementById(FORMULARIO_CODIGOS) as HTMLFormElement | null;
  if (!formulario) return [];
  return [...formulario.elements].filter(
    (e): e is HTMLInputElement => e instanceof HTMLInputElement && e.name === "ids",
  );
}

const codigos = (n: number) => (n === 1 ? "1 código" : `${n} códigos`);

/**
 * Barra encima de la lista de códigos: marca varios con las casillas y desactívalos (o
 * reactívalos) de una vez. Con Mayúsculas + clic se marcan todos los que hay entre dos casillas.
 */
export function SeleccionCodigos() {
  const [respuesta, despachar, enviando] = useActionState(
    cambiarDesactivacionSeleccionados,
    estadoInicial,
  );
  const [marcados, setMarcados] = useState(0);
  const [modo, setModo] = useState<"desactivar" | "reactivar" | null>(null);
  // Última casilla pulsada (para marcar un tramo con Mayúsculas)
  const ultima = useRef<number | null>(null);

  useEffect(() => {
    const contar = () => setMarcados(casillas().filter((c) => c.checked).length);
    // Mayúsculas + clic: marca (o desmarca) todas las casillas entre la anterior y esta
    const alPulsar = (evento: MouseEvent) => {
      const todas = casillas();
      const indice = todas.indexOf(evento.target as HTMLInputElement);
      if (indice < 0) return;
      if (evento.shiftKey && ultima.current !== null) {
        const [desde, hasta] = [ultima.current, indice].sort((a, b) => a - b);
        const valor = todas[indice].checked;
        for (let i = desde; i <= hasta; i++) todas[i].checked = valor;
      }
      ultima.current = indice;
      contar();
    };
    document.addEventListener("change", contar);
    document.addEventListener("click", alPulsar);
    return () => {
      document.removeEventListener("change", contar);
      document.removeEventListener("click", alPulsar);
    };
  }, []);

  const marcarTodas = () => {
    const todas = casillas();
    const valor = todas.some((c) => !c.checked);
    for (const c of todas) c.checked = valor;
    setMarcados(valor ? todas.length : 0);
  };

  const confirmar = () => {
    if (!modo) return;
    const datos = new FormData();
    datos.set("modo", modo);
    for (const c of casillas()) if (c.checked) datos.append("ids", c.value);
    startTransition(() => despachar(datos));
    // Ya van en "datos": se desmarcan para no cambiarlos otra vez sin querer
    for (const c of casillas()) c.checked = false;
    setMarcados(0);
    setModo(null);
  };

  return (
    <form
      id={FORMULARIO_CODIGOS}
      onSubmit={(e) => e.preventDefault()}
      className="space-y-2 border-b border-linea px-4 py-2"
    >
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
          variante="peligro"
          pequeno
          disabled={enviando || marcados === 0}
          onClick={() => setModo("desactivar")}
        >
          <Ban aria-hidden="true" className="size-4" />
          Desactivar seleccionados
        </BotonAdmin>
        <BotonAdmin
          variante="suave"
          pequeno
          disabled={enviando || marcados === 0}
          onClick={() => setModo("reactivar")}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Reactivar seleccionados
        </BotonAdmin>
      </div>
      <p className="hidden text-xs text-gris sm:block">
        Truco: marca una casilla y luego otra con la tecla Mayúsculas pulsada para marcar todas las
        de en medio.
      </p>

      <Dialogo
        abierto={modo !== null}
        alCerrar={() => setModo(null)}
        titulo={
          modo === "desactivar"
            ? `¿Desactivar ${codigos(marcados)}?`
            : `¿Reactivar ${codigos(marcados)}?`
        }
        className="max-w-md"
      >
        <div className="space-y-4 p-5 text-sm">
          <p className="leading-relaxed text-tinta/80">
            {modo === "desactivar"
              ? "Los códigos marcados dejarán de servir para activar el curso. Quien ya activó el suyo conserva su curso. Podrás reactivarlos después."
              : "Los códigos marcados volverán a servir para activar el curso."}
          </p>
          <div className="flex justify-end gap-2">
            <BotonAdmin variante="secundario" onClick={() => setModo(null)}>
              Cancelar
            </BotonAdmin>
            <BotonAdmin
              variante={modo === "desactivar" ? "peligro" : "primario"}
              onClick={confirmar}
              disabled={enviando}
            >
              {modo === "desactivar" ? "Sí, desactivar" : "Sí, reactivar"}
            </BotonAdmin>
          </div>
        </div>
      </Dialogo>
    </form>
  );
}
