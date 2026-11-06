"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { BotonAdmin } from "./BotonAdmin";

/**
 * Lista de filas que se pueden añadir, quitar y ordenar (datos técnicos, opciones de un test,
 * pistas de un reto, puntos fuertes de un kit…). Cada fila se dibuja con "fila".
 * Los campos de cada fila deben tener el mismo "name": el servidor los recibe en orden.
 */
export function ListaEditable<T>({
  inicial,
  vacia,
  fila,
  textoAnadir,
  maximo = 20,
  ordenable = false,
}: {
  inicial: T[];
  /** Valor de una fila nueva */
  vacia: T;
  /** Dibuja los campos de una fila (i = posición) */
  fila: (valor: T, i: number) => ReactNode;
  textoAnadir: string;
  maximo?: number;
  ordenable?: boolean;
}) {
  // Cada fila lleva una clave fija para que React no mezcle lo escrito al quitar o mover filas
  const siguiente = useRef(inicial.length);
  const [filas, setFilas] = useState(() => inicial.map((valor, i) => ({ clave: i, valor })));

  const mover = (i: number, paso: -1 | 1) =>
    setFilas((actuales) => {
      const copia = [...actuales];
      [copia[i], copia[i + paso]] = [copia[i + paso], copia[i]];
      return copia;
    });

  return (
    <div>
      <ul className="space-y-2">
        {filas.map(({ clave, valor }, i) => (
          <li key={clave} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">{fila(valor, i)}</div>
            <div className="flex shrink-0 gap-0.5 pt-1">
              {ordenable && (
                <>
                  <BotonAdmin
                    variante="suave"
                    pequeno
                    onClick={() => mover(i, -1)}
                    disabled={i === 0}
                    aria-label="Subir"
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </BotonAdmin>
                  <BotonAdmin
                    variante="suave"
                    pequeno
                    onClick={() => mover(i, 1)}
                    disabled={i === filas.length - 1}
                    aria-label="Bajar"
                  >
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </BotonAdmin>
                </>
              )}
              <BotonAdmin
                variante="suave"
                pequeno
                onClick={() => setFilas((actuales) => actuales.filter((f) => f.clave !== clave))}
                aria-label="Quitar"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </BotonAdmin>
            </div>
          </li>
        ))}
      </ul>
      {filas.length < maximo && (
        <BotonAdmin
          variante="secundario"
          pequeno
          className="mt-2"
          onClick={() =>
            setFilas((actuales) => [...actuales, { clave: siguiente.current++, valor: vacia }])
          }
        >
          <Plus aria-hidden="true" className="size-4" />
          {textoAnadir}
        </BotonAdmin>
      )}
    </div>
  );
}
