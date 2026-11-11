"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import type { GifEncontrado } from "@/config/gifs";
import { cn } from "@/lib/utils";

type Estado =
  | { tipo: "cargando" }
  | { tipo: "listo"; gifs: GifEncontrado[]; hayMas: boolean }
  | { tipo: "error"; mensaje: string; sinClave?: boolean };

/** Pide GIFs a nuestro servidor (que es quien habla con GIPHY con la clave) */
async function pedirGifs(busqueda: string, desde: number, senal: AbortSignal) {
  const parametros = new URLSearchParams({ q: busqueda, desde: String(desde) });
  const respuesta = await fetch(`/api/mensajes/gifs?${parametros}`, { signal: senal });
  const cuerpo = (await respuesta.json().catch(() => null)) as {
    gifs?: GifEncontrado[];
    error?: string;
    sinClave?: boolean;
  } | null;
  if (!respuesta.ok || !cuerpo?.gifs)
    return {
      error: cuerpo?.error ?? "No se han podido cargar los GIFs.",
      sinClave: !!cuerpo?.sinClave,
    };
  return { gifs: cuerpo.gifs };
}

/**
 * EL BOTÓN DE GIFs del chat: abre un panel con los GIFs del momento y un buscador («hola»,
 * «robot», «gracias»…). Al tocar uno, se envía al momento (como en WhatsApp). Salen de GIPHY.
 */
export function SelectorGifs({ elegir }: { elegir: (gif: GifEncontrado) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [cargandoMas, setCargandoMas] = useState(false);
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

  // Busca al dejar de escribir (un poco después, para no pedir una búsqueda por cada letra)
  useEffect(() => {
    if (!abierto) return;
    const control = new AbortController();
    const espera = setTimeout(
      async () => {
        setEstado({ tipo: "cargando" });
        try {
          const r = await pedirGifs(busqueda.trim(), 0, control.signal);
          setEstado(
            "gifs" in r && r.gifs
              ? { tipo: "listo", gifs: r.gifs, hayMas: r.gifs.length > 0 }
              : { tipo: "error", mensaje: r.error ?? "", sinClave: r.sinClave },
          );
        } catch {
          if (!control.signal.aborted)
            setEstado({ tipo: "error", mensaje: "Sin conexión: no se han podido cargar." });
        }
      },
      busqueda.trim() ? 450 : 0,
    );
    return () => {
      clearTimeout(espera);
      control.abort();
    };
  }, [abierto, busqueda]);

  const verMas = async () => {
    if (estado.tipo !== "listo" || cargandoMas) return;
    setCargandoMas(true);
    try {
      const r = await pedirGifs(busqueda.trim(), estado.gifs.length, new AbortController().signal);
      if ("gifs" in r && r.gifs) {
        const vistos = new Set(estado.gifs.map((g) => g.id));
        const nuevos = r.gifs.filter((g) => !vistos.has(g.id));
        setEstado({ tipo: "listo", gifs: [...estado.gifs, ...nuevos], hayMas: nuevos.length > 0 });
      }
    } catch {
      // Sin conexión: se queda lo que ya había
    } finally {
      setCargandoMas(false);
    }
  };

  const usar = (gif: GifEncontrado) => {
    setAbierto(false);
    elegir(gif);
  };

  return (
    <div ref={caja} className="shrink-0 sm:relative">
      <button
        type="button"
        onClick={() => {
          if (!abierto) setBusqueda("");
          setAbierto((v) => !v);
        }}
        aria-expanded={abierto}
        aria-label="GIFs"
        title="Enviar un GIF"
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-full text-gris transition-colors hover:bg-niebla hover:text-tinta",
          abierto && "bg-niebla text-tinta",
        )}
      >
        <span
          aria-hidden="true"
          className="rounded-[4px] border-[1.5px] border-current px-1 text-[10px] leading-[14px] font-bold"
        >
          GIF
        </span>
      </button>
      {abierto && (
        <div
          role="dialog"
          aria-label="Elegir GIF"
          className="absolute bottom-full left-3 z-20 mb-2 w-[min(22rem,calc(100vw-1.5rem))] animate-tarjeta rounded-xl border border-linea bg-white shadow-xl sm:left-0"
        >
          <div className="p-1.5">
            <label className="flex items-center gap-2 rounded-lg bg-niebla px-2.5">
              <Search aria-hidden="true" className="size-4 shrink-0 text-gris" />
              <span className="sr-only">Buscar GIF</span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar GIFs: hola, robot, gracias…"
                autoFocus
                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
          </div>
          <div className="max-h-80 overflow-y-auto overscroll-contain px-1.5 pb-1.5">
            {estado.tipo === "cargando" && (
              <p className="py-8 text-center text-sm text-gris">Cargando GIFs…</p>
            )}
            {estado.tipo === "error" && (
              <p role="alert" className="px-3 py-8 text-center text-sm text-gris">
                {estado.sinClave
                  ? "Los GIFs aún no están activados: falta poner la clave de GIPHY en la web (GIPHY_API_KEY)."
                  : estado.mensaje}
              </p>
            )}
            {estado.tipo === "listo" &&
              (estado.gifs.length === 0 ? (
                <p className="py-8 text-center text-sm text-gris">
                  No hay GIFs con «{busqueda.trim()}».
                </p>
              ) : (
                <>
                  <div className="columns-2 gap-1.5">
                    {estado.gifs.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => usar(g)}
                        aria-label={`Enviar el GIF${g.titulo ? `: ${g.titulo}` : ""}`}
                        className="mb-1.5 block w-full break-inside-avoid overflow-hidden rounded-md bg-niebla hover:opacity-80 focus-visible:ring-2 focus-visible:ring-acento"
                      >
                        <Image
                          src={g.vistaPrevia}
                          alt=""
                          width={g.ancho}
                          height={g.alto}
                          unoptimized
                          loading="lazy"
                          className="block h-auto w-full"
                          style={{ aspectRatio: `${g.ancho} / ${g.alto}` }}
                        />
                      </button>
                    ))}
                  </div>
                  {estado.hayMas && (
                    <button
                      type="button"
                      onClick={verMas}
                      disabled={cargandoMas}
                      className="mt-1 w-full rounded-md py-2 text-sm text-acento hover:bg-niebla disabled:opacity-50"
                    >
                      {cargandoMas ? "Cargando…" : "Ver más"}
                    </button>
                  )}
                </>
              ))}
          </div>
          {/* GIPHY pide que se diga de dónde salen */}
          <p className="border-t border-linea px-3 py-1.5 text-right text-[11px] text-gris">
            GIFs de GIPHY
          </p>
        </div>
      )}
    </div>
  );
}
