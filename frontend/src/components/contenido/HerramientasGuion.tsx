"use client";

import {
  Check,
  Copy,
  Download,
  FlipHorizontal2,
  Minus,
  MonitorPlay,
  Pause,
  Play,
  Plus,
  Printer,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface TextoParaHerramientas {
  titulo: string;
  gancho: string;
  desarrollo: string;
  llamadaAccion: string;
  notasVisuales: string;
  /** «TikTok / Reels / Shorts · 45 segundos · fecha límite 30 nov 2026» */
  ficha: string;
}

/** El guion entero como texto normal (para copiar o descargar) */
function comoTexto(g: TextoParaHerramientas) {
  return [
    g.titulo.toUpperCase(),
    g.ficha,
    "",
    "GANCHO (primeros 3 segundos)",
    g.gancho,
    "",
    "DESARROLLO",
    g.desarrollo,
    "",
    "LLAMADA A LA ACCIÓN",
    g.llamadaAccion,
    "",
    "NOTAS VISUALES PARA LA EDICIÓN",
    g.notasVisuales,
    "",
  ].join("\n");
}

/** Nombre de archivo sin acentos ni símbolos: «idea-robot-que-baila.txt» */
const nombreArchivo = (titulo: string) =>
  `${
    titulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "guion"
  }.txt`;

const boton =
  "inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm ring-1 ring-linea transition-colors hover:bg-niebla hover:ring-tinta/30";

/**
 * Barra de herramientas del guion: copiar el texto, descargarlo, imprimirlo y leerlo en el
 * teleprompter (para grabar la voz o a cámara).
 */
export function HerramientasGuion({ guion }: { guion: TextoParaHerramientas }) {
  const [copiado, setCopiado] = useState(false);
  const [teleprompter, setTeleprompter] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(comoTexto(guion));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: no pasa nada, puede seleccionarlo a mano
    }
  };

  const descargar = () => {
    const url = URL.createObjectURL(new Blob([comoTexto(guion)], { type: "text/plain" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo(guion.titulo);
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 print:hidden">
        <button type="button" onClick={() => setTeleprompter(true)} className={boton}>
          <MonitorPlay aria-hidden="true" className="size-4" /> Teleprompter
        </button>
        <button type="button" onClick={copiar} className={boton}>
          {copiado ? (
            <Check aria-hidden="true" className="size-4 text-exito" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copiado ? "Copiado" : "Copiar texto"}
        </button>
        <button type="button" onClick={descargar} className={boton}>
          <Download aria-hidden="true" className="size-4" /> Descargar .txt
        </button>
        <button type="button" onClick={() => window.print()} className={boton}>
          <Printer aria-hidden="true" className="size-4" /> Imprimir
        </button>
      </div>
      {teleprompter && <Teleprompter guion={guion} alCerrar={() => setTeleprompter(false)} />}
    </>
  );
}

/**
 * TELEPROMPTER: el texto que se dice, grande y en blanco sobre negro, subiendo solo.
 * Espacio = empezar/parar · flechas arriba/abajo = velocidad · Esc = cerrar.
 * «Espejo» le da la vuelta para los teleprompter con cristal.
 */
function Teleprompter({ guion, alCerrar }: { guion: TextoParaHerramientas; alCerrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null);
  const [andando, setAndando] = useState(false);
  const [velocidad, setVelocidad] = useState(3); // 1 a 10
  const [tamano, setTamano] = useState(44); // píxeles
  const [espejo, setEspejo] = useState(false);

  // Avanza unos píxeles por fotograma según la velocidad
  useEffect(() => {
    if (!andando) return;
    let anterior = performance.now();
    let resto = 0;
    let marco = requestAnimationFrame(function paso(ahora) {
      const elemento = caja.current;
      if (!elemento) return;
      resto += ((ahora - anterior) / 1000) * velocidad * 18;
      anterior = ahora;
      const entero = Math.floor(resto);
      if (entero > 0) {
        elemento.scrollTop += entero;
        resto -= entero;
      }
      if (elemento.scrollTop + elemento.clientHeight >= elemento.scrollHeight - 1) {
        setAndando(false);
        return;
      }
      marco = requestAnimationFrame(paso);
    });
    return () => cancelAnimationFrame(marco);
  }, [andando, velocidad]);

  // Teclado y sin scroll en la página de detrás mientras está abierto
  useEffect(() => {
    const teclas = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") alCerrar();
      else if (evento.key === " ") {
        evento.preventDefault();
        setAndando((a) => !a);
      } else if (evento.key === "ArrowUp") {
        evento.preventDefault();
        setVelocidad((v) => Math.min(10, v + 1));
      } else if (evento.key === "ArrowDown") {
        evento.preventDefault();
        setVelocidad((v) => Math.max(1, v - 1));
      }
    };
    const desbordeAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", teclas);
    return () => {
      document.body.style.overflow = desbordeAntes;
      window.removeEventListener("keydown", teclas);
    };
  }, [alCerrar]);

  const control =
    "inline-flex size-9 items-center justify-center rounded-md bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Teleprompter"
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 text-sm">
        <button
          type="button"
          onClick={() => setAndando((a) => !a)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 font-medium text-black"
        >
          {andando ? <Pause className="size-4" /> : <Play className="size-4" />}
          {andando ? "Parar" : "Empezar"}
        </button>
        <span className="ml-2 text-white/60">Velocidad</span>
        <button
          type="button"
          aria-label="Más despacio"
          disabled={velocidad <= 1}
          onClick={() => setVelocidad((v) => v - 1)}
          className={control}
        >
          <Minus className="size-4" />
        </button>
        <span className="w-5 text-center tabular-nums">{velocidad}</span>
        <button
          type="button"
          aria-label="Más deprisa"
          disabled={velocidad >= 10}
          onClick={() => setVelocidad((v) => v + 1)}
          className={control}
        >
          <Plus className="size-4" />
        </button>
        <span className="ml-2 text-white/60">Letra</span>
        <button
          type="button"
          aria-label="Letra más pequeña"
          disabled={tamano <= 24}
          onClick={() => setTamano((t) => t - 6)}
          className={control}
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Letra más grande"
          disabled={tamano >= 96}
          onClick={() => setTamano((t) => t + 6)}
          className={control}
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          aria-pressed={espejo}
          onClick={() => setEspejo((e) => !e)}
          className={cn(control, "w-auto gap-1.5 px-3", espejo && "bg-white/30")}
        >
          <FlipHorizontal2 className="size-4" /> Espejo
        </button>
        <span className="hidden text-white/40 lg:inline">
          Espacio: empezar/parar · ↑↓: velocidad · Esc: cerrar
        </span>
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar el teleprompter"
          className={cn(control, "ml-auto")}
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* Línea guía a la altura de los ojos */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/3 z-10 border-t-2 border-acento-claro/70"
        />
        <div
          ref={caja}
          className="h-full overflow-y-auto px-6 sm:px-[12%]"
          style={{ transform: espejo ? "scaleX(-1)" : undefined }}
        >
          <div
            className="mx-auto max-w-5xl pt-[33vh] pb-[70vh] leading-snug font-medium whitespace-pre-wrap"
            style={{ fontSize: tamano }}
          >
            <p>{guion.gancho}</p>
            <p className="mt-[1.2em]">{guion.desarrollo}</p>
            <p className="mt-[1.2em]">{guion.llamadaAccion}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
