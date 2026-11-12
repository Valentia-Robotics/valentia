"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Modelo3D } from "@/config/modelos3d";
import { cn } from "@/lib/utils";
import type { ControlVisor } from "@/lib/visor3d/escenaVisor";

interface Props {
  modelo: Modelo3D;
  nombre: string;
  /** Lo que se ve si el 3D no puede abrirse (sin WebGL, archivo roto…): la foto de siempre */
  alternativa: ReactNode;
  className?: string;
}

type Estado = "cargando" | "listo" | "error";

/**
 * VISOR 3D DE UNA PIEZA, lo más limpio posible (Jesse: «demasiado detalle y texto»): la pieza gira sola,
 * se gira arrastrando y se acerca con la rueda o dos dedos, y un solo botón «Medidas» enseña su tamaño real.
 * three.js se descarga solo cuando el visor aparece en pantalla.
 */
export function Visor3D({ modelo, nombre, alternativa, className }: Props) {
  const marco = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const control = useRef<ControlVisor | null>(null);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [progreso, setProgreso] = useState(0);
  const [verMedidas, setVerMedidas] = useState(false);

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
          });
          if (cancelado) return visor.destruir();
          control.current = visor;
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

  if (estado === "error") return <>{alternativa}</>;

  return (
    <div className={className}>
      <div
        ref={marco}
        className="relative aspect-square w-full overflow-hidden rounded-tarjeta bg-[radial-gradient(ellipse_at_50%_40%,#ffffff_0%,#f4f4f2_55%,#e9e9e5_100%)]"
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
            </div>
          </div>
        )}

        {/* Un solo botón discreto: las medidas. Girar y acercar se hacen con el dedo o el ratón */}
        {estado === "listo" && (
          <button
            type="button"
            className={cn(
              "absolute right-3 bottom-3 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
              verMedidas
                ? "bg-tinta text-white ring-tinta"
                : "bg-white/80 text-tinta ring-linea backdrop-blur hover:bg-white",
            )}
            aria-pressed={verMedidas}
            onClick={() => {
              control.current?.verMedidas(!verMedidas);
              setVerMedidas(!verMedidas);
            }}
          >
            Medidas
          </button>
        )}
      </div>
    </div>
  );
}
