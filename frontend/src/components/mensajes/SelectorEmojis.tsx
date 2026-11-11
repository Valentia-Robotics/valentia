"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { GRUPOS_EMOJI } from "@/config/mensajes";
import { cn } from "@/lib/utils";

const CLAVE_RECIENTES = "valentia-emojis-recientes";
const MAX_RECIENTES = 24;

function leerRecientes(): string[] {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? "[]");
    return Array.isArray(guardados) ? guardados.filter((e) => typeof e === "string") : [];
  } catch {
    return [];
  }
}

/**
 * EL BOTÓN DE EMOJIS del chat: abre un panel con los emojis por grupos (y los últimos que has
 * usado). Al tocar uno se mete en el texto donde esté el cursor. Sin librerías: los dibuja el
 * propio móvil u ordenador.
 */
export function SelectorEmojis({ elegir }: { elegir: (emoji: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [grupo, setGrupo] = useState(0);
  const [recientes, setRecientes] = useState<string[]>([]);
  const caja = useRef<HTMLDivElement>(null);

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
    }
    setAbierto((v) => !v);
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
    ...GRUPOS_EMOJI.map((g, indice) => ({ indice, icono: g.icono, nombre: g.nombre })),
  ];
  const emojis = grupo === -1 ? recientes : (GRUPOS_EMOJI[grupo]?.emojis ?? []);

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
          className="absolute bottom-full left-3 z-20 mb-2 w-[min(20rem,calc(100vw-1.5rem))] animate-tarjeta rounded-xl border border-linea bg-white shadow-xl sm:left-0"
        >
          <div role="tablist" className="flex gap-0.5 border-b border-linea p-1.5">
            {pestanas.map((p) => (
              <button
                key={p.indice}
                type="button"
                role="tab"
                aria-selected={grupo === p.indice}
                aria-label={p.nombre}
                title={p.nombre}
                onClick={() => setGrupo(p.indice)}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-md text-lg",
                  grupo === p.indice ? "bg-niebla" : "hover:bg-niebla/60",
                )}
              >
                {p.icono}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto p-1.5">
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
