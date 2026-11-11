"use client";

import { Maximize2, Minimize2, Minus, Plus, RotateCcw, Ruler } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Modelo3D } from "@/config/modelos3d";
import { textoMedida } from "@/config/modelos3d";
import { cn } from "@/lib/utils";
import type { ControlVisor, Medidas } from "@/lib/visor3d/escenaVisor";

interface Props {
  modelo: Modelo3D;
  nombre: string;
  /** Lo que se ve si el 3D no puede abrirse (sin WebGL, archivo roto…): la foto de siempre */
  alternativa: ReactNode;
  className?: string;
}

type Estado = "cargando" | "listo" | "error";

/**
 * VISOR 3D DE UNA PIEZA: girar (arrastrar), acercar (rueda o pellizco), ver las medidas reales y
 * ponerlo a pantalla completa. three.js se descarga solo cuando el visor aparece en pantalla.
 */
export function Visor3D({ modelo, nombre, alternativa, className }: Props) {
  const marco = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const control = useRef<ControlVisor | null>(null);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [progreso, setProgreso] = useState(0);
  const [medidas, setMedidas] = useState<Medidas | null>(null);
  const [verMedidas, setVerMedidas] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [completa, setCompleta] = useState(false);

  useEffect(() => {
    const contenedor = lienzo.current;
    if (!contenedor) return;
    let cancelado = false;
    let visor: ControlVisor | null = null;

    // Se espera a que el visor esté a la vista (en una lista larga no se carga lo que no se ve)
    const observador = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting) return;
        observador.disconnect();
        try {
          const { crearVisor, hayWebGL } = await import("@/lib/visor3d/escenaVisor");
          if (!hayWebGL()) throw new Error("sin WebGL");
          visor = await crearVisor(contenedor, modelo, {
            alProgreso: (f) => !cancelado && setProgreso(f),
            alTocar: () => !cancelado && setTocado(true),
          });
          if (cancelado) return visor.destruir();
          control.current = visor;
          setMedidas(visor.medidas);
          setEstado("listo");
        } catch (error) {
          console.warn("[visor3d] No se pudo abrir el modelo", modelo.url, error);
          if (!cancelado) setEstado("error");
        }
      },
      { rootMargin: "200px" },
    );
    observador.observe(contenedor);

    return () => {
      cancelado = true;
      observador.disconnect();
      visor?.destruir();
      control.current = null;
    };
  }, [modelo]);

  // Pantalla completa (si el navegador no la deja, el botón no hace nada)
  useEffect(() => {
    const alCambiar = () => setCompleta(document.fullscreenElement === marco.current);
    document.addEventListener("fullscreenchange", alCambiar);
    return () => document.removeEventListener("fullscreenchange", alCambiar);
  }, []);
  const alternarCompleta = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void marco.current?.requestFullscreen?.().catch(() => {});
  };

  if (estado === "error") return <>{alternativa}</>;

  const boton =
    "grid size-9 place-items-center rounded-control bg-white/90 text-tinta shadow-sm ring-1 ring-linea backdrop-blur transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-acento";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        ref={marco}
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-tarjeta bg-niebla",
          completa && "aspect-auto rounded-none",
        )}
        role="img"
        aria-label={`Modelo 3D de ${nombre}. Arrastra para girarlo.`}
      >
        <div ref={lienzo} className="absolute inset-0" />

        {estado === "cargando" && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-32 text-center">
              <div className="h-0.5 overflow-hidden bg-linea">
                <div
                  className="h-full bg-acento transition-[width]"
                  style={{ width: `${Math.round(progreso * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gris">Cargando en 3D…</p>
            </div>
          </div>
        )}

        {estado === "listo" && (
          <>
            {!tocado && (
              <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-gris">
                Arrastra para girar · rueda o pellizco para acercar
              </p>
            )}
            <div className="absolute top-2 right-2 flex flex-col gap-1.5">
              <button
                type="button"
                className={cn(
                  boton,
                  verMedidas && "bg-acento text-white ring-acento hover:bg-acento",
                )}
                aria-pressed={verMedidas}
                aria-label="Ver medidas"
                title="Ver medidas"
                onClick={() => {
                  control.current?.verMedidas(!verMedidas);
                  setVerMedidas(!verMedidas);
                }}
              >
                <Ruler aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                className={boton}
                aria-label="Acercar"
                title="Acercar"
                onClick={() => control.current?.acercar(1.3)}
              >
                <Plus aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                className={boton}
                aria-label="Alejar"
                title="Alejar"
                onClick={() => control.current?.acercar(1 / 1.3)}
              >
                <Minus aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                className={boton}
                aria-label="Volver a la vista inicial"
                title="Volver a la vista inicial"
                onClick={() => control.current?.reencuadrar()}
              >
                <RotateCcw aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                className={boton}
                aria-label={completa ? "Salir de pantalla completa" : "Pantalla completa"}
                title={completa ? "Salir de pantalla completa" : "Pantalla completa"}
                onClick={alternarCompleta}
              >
                {completa ? (
                  <Minimize2 aria-hidden="true" className="size-4" />
                ) : (
                  <Maximize2 aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {medidas && (
        <p className="text-center font-mono text-xs text-gris">
          {textoMedida(medidas.ancho)} × {textoMedida(medidas.fondo)} × {textoMedida(medidas.alto)}
          <span className="sr-only"> (ancho, fondo y alto)</span>
        </p>
      )}
    </div>
  );
}
