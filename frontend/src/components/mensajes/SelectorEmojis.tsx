"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  Clock,
  Flag,
  Hand,
  Lightbulb,
  PawPrint,
  Pizza,
  Plane,
  Search,
  Shapes,
  Smile,
  Volleyball,
} from "lucide-react";
import { buscarEmojis } from "@/config/mensajes";
import { cn } from "@/lib/utils";

type Categorias = typeof import("@/config/emojis").CATEGORIAS_EMOJI;

const CLAVE_RECIENTES = "valentia-emojis-recientes";
const MAX_RECIENTES = 32;

/**
 * Iconos de las pestañas, en el orden de CATEGORIAS_EMOJI. Son dibujos de línea y no emojis para
 * que se distingan de los emojis que se pueden elegir (Jesse creía que solo había esos).
 */
const ICONOS: ComponentType<{ className?: string }>[] = [
  Smile,
  Hand,
  PawPrint,
  Pizza,
  Plane,
  Volleyball,
  Lightbulb,
  Shapes,
  Flag,
];

function leerRecientes(): string[] {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? "[]");
    return Array.isArray(guardados) ? guardados.filter((e) => typeof e === "string") : [];
  } catch {
    return [];
  }
}

/**
 * EL BOTÓN DE EMOJIS del chat: abre un panel con TODOS los emojis (casi 1.900) en una sola lista
 * con títulos (Recientes, Caras, Personas…), como en WhatsApp: las pestañas de arriba solo saltan
 * a cada parte. Buscador en español («corazon», «robot», «fiesta»…). Al tocar un emoji se mete en
 * el texto donde esté el cursor. La lista se descarga solo la primera vez que se abre
 * (src/config/emojis.ts). Los dibuja el propio móvil u ordenador.
 */
export function SelectorEmojis({ elegir }: { elegir: (emoji: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [grupo, setGrupo] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [recientes, setRecientes] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<Categorias | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLDivElement>(null);

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

  // Las pestañas saltan a su parte de la lista (si estabas buscando, se borra la búsqueda)
  const irA = (indice: number) => {
    setGrupo(indice);
    setBusqueda("");
    requestAnimationFrame(() => {
      const contenedor = lista.current;
      const seccion = contenedor?.querySelector<HTMLElement>(`[data-parte="${indice}"]`);
      if (contenedor && seccion) contenedor.scrollTo({ top: seccion.offsetTop });
    });
  };

  // Al bajar por la lista se marca la pestaña de la parte que estás viendo
  const alDesplazar = () => {
    const contenedor = lista.current;
    if (!contenedor || busqueda.trim() !== "") return;
    let actual = grupo;
    for (const seccion of contenedor.querySelectorAll<HTMLElement>("[data-parte]")) {
      if (seccion.offsetTop <= contenedor.scrollTop + 8) actual = Number(seccion.dataset.parte);
    }
    if (actual !== grupo) setGrupo(actual);
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

  // Recientes primero y luego todas las categorías, una detrás de otra
  const partes = [
    ...(recientes.length > 0
      ? [{ indice: -1, nombre: "Recientes", Icono: Clock, emojis: recientes }]
      : []),
    ...(categorias ?? []).map((g, indice) => ({
      indice,
      nombre: g.nombre,
      Icono: ICONOS[indice] ?? Shapes,
      emojis: g.emojis.map(([e]) => e),
    })),
  ];
  const buscando = busqueda.trim() !== "";
  const resultados = buscando ? buscarEmojis(categorias ?? [], busqueda) : [];

  const boton = (e: string) => (
    <button
      key={e}
      type="button"
      onClick={() => usar(e)}
      aria-label={e}
      className="inline-flex aspect-square items-center justify-center rounded-md text-2xl leading-none hover:bg-niebla"
    >
      {e}
    </button>
  );

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
          className="absolute bottom-full left-3 z-20 mb-2 w-[min(22rem,calc(100vw-1.5rem))] animate-tarjeta rounded-xl border border-linea bg-white shadow-xl sm:left-0"
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
            aria-label="Categorías"
            className="flex [scrollbar-width:none] gap-0.5 overflow-x-auto border-b border-linea p-1.5"
          >
            {partes.map(({ indice, nombre, Icono }) => (
              <button
                key={indice}
                type="button"
                role="tab"
                aria-selected={!buscando && grupo === indice}
                aria-label={nombre}
                title={nombre}
                onClick={() => irA(indice)}
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-md",
                  !buscando && grupo === indice
                    ? "bg-niebla text-acento"
                    : "text-gris hover:bg-niebla/60 hover:text-tinta",
                )}
              >
                <Icono className="size-[1.1rem]" />
              </button>
            ))}
          </div>
          <div
            ref={lista}
            onScroll={alDesplazar}
            className="relative max-h-72 overflow-y-auto overscroll-contain px-1.5 pb-1.5"
          >
            {!categorias && <p className="py-6 text-center text-sm text-gris">Cargando emojis…</p>}
            {buscando
              ? categorias &&
                (resultados.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gris">
                    No hay ningún emoji con «{busqueda.trim()}».
                  </p>
                ) : (
                  <div
                    role="group"
                    aria-label="Resultados"
                    className="grid grid-cols-8 gap-0.5 pt-1.5"
                  >
                    {resultados.map(boton)}
                  </div>
                ))
              : partes.map((parte) => (
                  <section key={parte.indice} data-parte={parte.indice} aria-label={parte.nombre}>
                    <h3 className="sticky top-0 z-10 bg-white/95 px-1 pt-2 pb-1 text-xs font-medium text-gris">
                      {parte.nombre}
                    </h3>
                    <div className="grid grid-cols-8 gap-0.5">{parte.emojis.map(boton)}</div>
                  </section>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
