"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import type { GifEncontrado, TipoGif } from "@/config/gifs";
import { cn } from "@/lib/utils";

type Estado =
  | { tipo: "cargando" }
  | { tipo: "listo"; gifs: GifEncontrado[]; hayMas: boolean }
  | { tipo: "error"; mensaje: string; sinClave?: boolean };

/** Pide GIFs (o stickers) a nuestro servidor (que es quien habla con GIPHY con la clave) */
async function pedirGifs(tipo: TipoGif, busqueda: string, desde: number, senal: AbortSignal) {
  const parametros = new URLSearchParams({ q: busqueda, desde: String(desde), tipo });
  const respuesta = await fetch(`/api/mensajes/gifs?${parametros}`, { signal: senal });
  const cuerpo = (await respuesta.json().catch(() => null)) as {
    gifs?: GifEncontrado[];
    error?: string;
    sinClave?: boolean;
  } | null;
  if (!respuesta.ok || !cuerpo?.gifs)
    return {
      error: cuerpo?.error ?? `No se han podido cargar los ${TEXTOS[tipo].plural}.`,
      sinClave: !!cuerpo?.sinClave,
    };
  return { gifs: cuerpo.gifs };
}

const TEXTOS: Record<TipoGif, { plural: string; uno: string; ejemplo: string }> = {
  gifs: { plural: "GIFs", uno: "el GIF", ejemplo: "hola, robot, gracias…" },
  stickers: { plural: "stickers", uno: "el sticker", ejemplo: "ok, feliz, wow…" },
};

/**
 * EL PANEL DE GIFs O STICKERS del chat (se abre desde el menú «+»): los del momento y un buscador
 * («hola», «robot», «gracias»…). Al tocar uno, se envía al momento (como en WhatsApp). Salen de
 * GIPHY. Los stickers son GIFs con el fondo transparente: en el chat se ven sin burbuja.
 */
export function SelectorGifs({
  tipo,
  elegir,
  alCerrar,
}: {
  tipo: TipoGif;
  elegir: (gif: GifEncontrado) => void;
  alCerrar: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [cargandoMas, setCargandoMas] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const textos = TEXTOS[tipo];

  // Se cierra al tocar fuera o con Escape
  useEffect(() => {
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) alCerrar();
    };
    const escape = (e: globalThis.KeyboardEvent) => e.key === "Escape" && alCerrar();
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [alCerrar]);

  // Busca al dejar de escribir (un poco después, para no pedir una búsqueda por cada letra)
  useEffect(() => {
    const control = new AbortController();
    const espera = setTimeout(
      async () => {
        setEstado({ tipo: "cargando" });
        try {
          const r = await pedirGifs(tipo, busqueda.trim(), 0, control.signal);
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
  }, [tipo, busqueda]);

  const verMas = async () => {
    if (estado.tipo !== "listo" || cargandoMas) return;
    setCargandoMas(true);
    try {
      const r = await pedirGifs(
        tipo,
        busqueda.trim(),
        estado.gifs.length,
        new AbortController().signal,
      );
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
    alCerrar();
    elegir(gif);
  };

  return (
    <div
      ref={caja}
      role="dialog"
      aria-label={`Elegir ${textos.uno.replace(/^el /, "")}`}
      className="absolute bottom-full left-3 z-20 mb-2 w-[min(22rem,calc(100vw-1.5rem))] animate-tarjeta rounded-xl border border-linea bg-white shadow-xl"
    >
      <div className="p-1.5">
        <label className="flex items-center gap-2 rounded-lg bg-niebla px-2.5">
          <Search aria-hidden="true" className="size-4 shrink-0 text-gris" />
          <span className="sr-only">Buscar {textos.plural}</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={`Buscar ${textos.plural}: ${textos.ejemplo}`}
            autoFocus
            className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      </div>
      <div className="max-h-80 overflow-y-auto overscroll-contain px-1.5 pb-1.5">
        {estado.tipo === "cargando" && (
          <p className="py-8 text-center text-sm text-gris">Cargando {textos.plural}…</p>
        )}
        {estado.tipo === "error" && (
          <p role="alert" className="px-3 py-8 text-center text-sm text-gris">
            {estado.sinClave
              ? `Los ${textos.plural} aún no están activados: falta poner la clave de GIPHY en la web (GIPHY_API_KEY).`
              : estado.mensaje}
          </p>
        )}
        {estado.tipo === "listo" &&
          (estado.gifs.length === 0 ? (
            <p className="py-8 text-center text-sm text-gris">
              No hay {textos.plural} con «{busqueda.trim()}».
            </p>
          ) : (
            <>
              <div className={cn("gap-1.5", tipo === "stickers" ? "columns-3" : "columns-2")}>
                {estado.gifs.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => usar(g)}
                    aria-label={`Enviar ${textos.uno}${g.titulo ? `: ${g.titulo}` : ""}`}
                    className={cn(
                      "mb-1.5 block w-full break-inside-avoid overflow-hidden rounded-md hover:opacity-80 focus-visible:ring-2 focus-visible:ring-acento",
                      tipo === "gifs" && "bg-niebla",
                    )}
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
        {tipo === "stickers" ? "Stickers" : "GIFs"} de GIPHY
      </p>
    </div>
  );
}
