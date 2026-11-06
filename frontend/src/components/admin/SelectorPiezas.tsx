"use client";

import Image from "next/image";
import { Plus, Search, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { nombreCategoria } from "@/config/categorias";
import type { Categoria } from "@/generated/prisma/enums";
import { formatearPrecio } from "@/lib/utils";
import { BotonAdmin } from "./BotonAdmin";
import { Insignia } from "./Insignia";

export interface PiezaDisponible {
  id: string;
  nombre: string;
  categoria: Categoria;
  imagen: string;
  precioCentimos: number;
  visible: boolean;
}

/** Quita tildes y mayúsculas para buscar sin preocuparse de cómo se escribe */
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Elegir las piezas de un kit: a la izquierda, todos los componentes con un buscador;
 * a la derecha, las piezas elegidas con su cantidad.
 * Envía al servidor dos listas: "piezaId" y "piezaCantidad".
 */
export function SelectorPiezas({
  disponibles,
  inicial,
  error,
}: {
  disponibles: PiezaDisponible[];
  inicial: { id: string; cantidad: number }[];
  error?: string;
}) {
  const idBuscador = useId();
  const [busqueda, setBusqueda] = useState("");
  const [elegidas, setElegidas] = useState(inicial);
  const porId = useMemo(() => new Map(disponibles.map((p) => [p.id, p])), [disponibles]);

  const resultados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return disponibles.filter(
      (p) =>
        !elegidas.some((e) => e.id === p.id) &&
        (!q || normalizar(`${p.nombre} ${nombreCategoria(p.categoria)}`).includes(q)),
    );
  }, [busqueda, disponibles, elegidas]);

  const sumaPiezas = elegidas.reduce(
    (total, e) => total + (porId.get(e.id)?.precioCentimos ?? 0) * e.cantidad,
    0,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ---------- Catálogo con buscador ---------- */}
      <div>
        <label htmlFor={idBuscador} className="text-[13px] font-medium">
          Buscar componentes
        </label>
        <div className="relative mt-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris"
          />
          <input
            id={idBuscador}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            // Enter en el buscador no debe enviar el formulario
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            placeholder="Nombre o categoría"
            className="h-9 w-full rounded-md bg-white pr-3 pl-9 text-sm ring-1 ring-linea outline-none focus:ring-2 focus:ring-acento"
          />
        </div>
        <ul className="mt-2 max-h-80 divide-y divide-linea overflow-y-auto rounded-md ring-1 ring-linea">
          {resultados.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Image
                src={p.imagen}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="size-8 shrink-0 rounded bg-niebla object-contain"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate">{p.nombre}</p>
                <p className="text-xs text-gris">
                  {nombreCategoria(p.categoria)} · {formatearPrecio(p.precioCentimos)}
                  {!p.visible && " · oculto"}
                </p>
              </div>
              <BotonAdmin
                variante="secundario"
                pequeno
                onClick={() => setElegidas((actuales) => [...actuales, { id: p.id, cantidad: 1 }])}
                aria-label={`Añadir ${p.nombre}`}
              >
                <Plus aria-hidden="true" className="size-4" />
                Añadir
              </BotonAdmin>
            </li>
          ))}
          {resultados.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-gris">
              {busqueda.trim()
                ? "Ningún componente coincide con la búsqueda."
                : "Ya están todos en la caja."}
            </li>
          )}
        </ul>
      </div>

      {/* ---------- Piezas elegidas ---------- */}
      <div>
        <p className="text-[13px] font-medium">En la caja ({elegidas.length})</p>
        <ul
          className={`mt-1 divide-y divide-linea rounded-md ring-1 ${error ? "ring-error" : "ring-linea"}`}
          aria-describedby={error ? `${idBuscador}-error` : undefined}
        >
          {elegidas.map((e, i) => {
            const pieza = porId.get(e.id);
            if (!pieza) return null;
            return (
              <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <input type="hidden" name="piezaId" value={e.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    {pieza.nombre} {!pieza.visible && <Insignia>Oculto</Insignia>}
                  </p>
                  <p className="text-xs text-gris">{formatearPrecio(pieza.precioCentimos)} / ud.</p>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-gris">
                  Cantidad
                  <input
                    name="piezaCantidad"
                    type="number"
                    min={1}
                    max={50}
                    value={e.cantidad}
                    onChange={(ev) => {
                      const cantidad = Math.max(1, Math.min(50, Number(ev.target.value) || 1));
                      setElegidas((actuales) =>
                        actuales.map((a, j) => (j === i ? { ...a, cantidad } : a)),
                      );
                    }}
                    className="h-8 w-16 rounded-md bg-white px-2 text-sm text-tinta ring-1 ring-linea outline-none focus:ring-2 focus:ring-acento"
                  />
                </label>
                <BotonAdmin
                  variante="suave"
                  pequeno
                  onClick={() => setElegidas((actuales) => actuales.filter((a) => a.id !== e.id))}
                  aria-label={`Quitar ${pieza.nombre}`}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </BotonAdmin>
              </li>
            );
          })}
          {elegidas.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-gris">
              Todavía no hay piezas. Añádelas desde la lista.
            </li>
          )}
        </ul>
        {error && (
          <p id={`${idBuscador}-error`} className="mt-1 text-xs text-error">
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-gris">
          Compradas sueltas, estas piezas costarían {formatearPrecio(sumaPiezas)}.
        </p>
      </div>
    </div>
  );
}
