"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Smile } from "lucide-react";
import { buscarEmojis } from "@/config/mensajes";
import { cn } from "@/lib/utils";

type Categorias = typeof import("@/config/emojis").CATEGORIAS_EMOJI;

const CLAVE_RECIENTES = "valentia-emojis-recientes";
const MAX_RECIENTES = 32;

function leerRecientes(): string[] {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? "[]");
    return Array.isArray(guardados) ? guardados.filter((e) => typeof e === "string") : [];
  } catch {
    return [];
  }
}

/**
 * EL BOTÓN DE EMOJIS del chat: abre un panel con TODOS los emojis (casi 1.900) por categorías,
 * un buscador en español («corazon», «robot», «fiesta»…) y los últimos que has usado. Al tocar
 * uno se mete en el texto donde esté el cursor. La lista se descarga solo la primera vez que se
 * abre (src/config/emojis.ts). Los dibuja el propio móvil u ordenador.
 */
export function SelectorEmojis({ elegir }: { elegir: (emoji: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [grupo, setGrupo] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [recientes, setRecientes] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<Categorias | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const rejilla = useRef<HTMLDivElement>(null);

  // Se cierra al tocar fuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const abrir = () => {
    if (!abierto) {
      const ultimos = leerRecientes();
      setRecientes(ultimos);
      setGrupo(ultimos.length > 0 ? -1 : 0);
      setBusqueda("");
      if (!categorias) {
        void import("@/config/emojis").then((m) => setCategorias(m.CATEGORIAS_EMOJI));
      }
    }
    setAbierto((v) => !v);
  };

  const cambiarGrupo = (indice: number) => {
    setGrupo(indice);
    setBusqueda("");
    rejilla.current?.scrollTo({ top: 0 });
  };

  const usar = (emoji: string) => {
    elegir(emoji);
    const nuevos = [emoji, ...recientes.filter((e) => e !== emoji)].slice(0, MAX_RECIENTES);
    setRecientes(nuevos);
    try {
      localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(nuevos));
    } catch {
      // Sin almacenamiento (modo privado…): simplemente no se recuerdan
    }
  };

  const pestanas = [
    ...(recientes.length > 0 ? [{ indice: -1, icono: "🕘", nombre: "Recientes" }] : []),
    ...(categorias ?? []).map((g, indice) => ({ indice, icono: g.icono, nombre: g.nombre })),
  ];
  const buscando = busqueda.trim() !== "";
  const emojis = buscando
    ? buscarEmojis(categorias ?? [], busqueda)
    : grupo === -1
      ? recientes
      : (categorias?.[grupo]?.emojis.map(([e]) => e) ?? []);

  return (
    <div ref={caja} className="shrink-0 sm:relative">
      <button
        type="button"
        onClick={abrir}
        aria-expanded={abierto}
        aria-label="Emojis"
        title="Emojis"
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-full text-gris transition-colors hover:bg-niebla hover:text-tinta",
          abierto && "bg-niebla text-tinta",
        )}
      >
        <Smile aria-hidden="true" className="size-5" />
      </button>
      {abierto && (
        <div
          role="dialog"
          aria-label="Elegir emoji"
          className="animate-tarjeta absolute bottom-full left-3 z-20 mb-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-linea bg-white shadow-xl sm:left-0"
        >
          <div className="p-1.5 pb-0">
            <label className="flex items-center gap-2 rounded-lg bg-niebla px-2.5">
              <Search aria-hidden="true" className="size-4 shrink-0 text-gris" />
              <span className="sr-only">Buscar emoji</span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar: corazón, robot, fiesta…"
                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
          </div>
          <div
            role="tablist"
            className="flex gap-0.5 overflow-x-auto border-b border-linea p-1.5 [scrollbar-width:none]"
          >
            {pestanas.map((p) => (
              <button
                key={p.indice}
                type="button"
                role="tab"
                aria-selected={!buscando && grupo === p.indice}
                aria-label={p.nombre}
                title={p.nombre}
                onClick={() => cambiarGrupo(p.indice)}
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-lg",
                  !buscando && grupo === p.indice ? "bg-niebla" : "hover:bg-niebla/60",
                )}
              >
                {p.icono}
              </button>
            ))}
          </div>
          <div
            ref={rejilla}
            role="tabpanel"
            aria-label={buscando ? "Resultados" : pestanas.find((p) => p.indice === grupo)?.nombre}
            className="grid max-h-60 grid-cols-8 content-start gap-0.5 overflow-y-auto overscroll-contain p-1.5"
          >
            {!categorias && grupo !== -1 && (
              <p className="col-span-8 py-6 text-center text-sm text-gris">Cargando emojis…</p>
            )}
            {categorias && buscando && emojis.length === 0 && (
              <p className="col-span-8 py-6 text-center text-sm text-gris">
                No hay ningún emoji con «{busqueda.trim()}».
              </p>
            )}
            {emojis.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => usar(e)}
                aria-label={e}
                className="inline-flex aspect-square items-center justify-center rounded-md text-2xl leading-none hover:bg-niebla"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
