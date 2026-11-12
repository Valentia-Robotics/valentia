"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Etiqueta } from "./Etiqueta";
import { PIEZAS_ROBOT, type PiezaRobot } from "./piezasRobot";

/** Foto de estudio de cada pieza (las mismas del configurador) y su dato técnico */
/** `alt` describe la foto: Bing avisa de las imágenes sin texto alternativo */
const FOTOS: Record<PiezaRobot["id"], { src: string; alt: string; dato: string }> = {
  chasis: {
    src: "/images/componentes/chasis-coche-2wd.webp",
    alt: "Chasis de metacrilato del coche robótico con dos ruedas y rueda loca",
    dato: "metacrilato · 2 ruedas + rueda loca",
  },
  placa: {
    src: "/images/componentes/esp32-devkit.webp",
    alt: "Placa ESP32 con wifi y bluetooth, el cerebro del robot",
    dato: "ESP32 · wifi + bluetooth",
  },
  motores: {
    src: "/images/componentes/motor-dc-reductora.webp",
    alt: "Motor DC con reductora para mover las ruedas",
    dato: "motor DC con reductora · 3-6 V",
  },
  sensores: {
    src: "/images/componentes/sensor-ultrasonidos-hc-sr04.webp",
    alt: "Sensor de ultrasonidos HC-SR04 para detectar obstáculos",
    dato: "ultrasonidos + sensores de línea",
  },
  bateria: {
    src: "/images/componentes/bateria-18650-2s.webp",
    alt: "Portabaterías con dos baterías recargables 18650",
    dato: "2 × 18650 recargables",
  },
};

/** Cada cuánto pasa el «escáner» a la pieza siguiente */
const MS_POR_PIEZA = 2200;

/**
 * EL ROBOT POR DENTRO (portada): las cinco piezas en un mosaico, cada una con su foto de estudio.
 * Un «escáner» azul va pasando solo de una a otra (se para fuera de pantalla y con «reducir
 * movimiento»); al pasar el ratón por una, se ilumina esa. En el móvil es una fila que se desliza.
 * Sustituye al coche 3D que se desmontaba con un scroll muy largo.
 */
export function PiezasPortada() {
  const seccion = useRef<HTMLElement>(null);
  const [activa, setActiva] = useState(0);
  const [encima, setEncima] = useState<number | null>(null);
  const [anda, setAnda] = useState(false);

  // El escáner solo anda a la vista y sin «reducir movimiento»
  useEffect(() => {
    const elemento = seccion.current;
    if (!elemento) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (quieto) return;
    const observador = new IntersectionObserver(([e]) => setAnda(e.isIntersecting), {
      threshold: 0.3,
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    if (!anda || encima !== null) return;
    const id = setInterval(() => setActiva((i) => (i + 1) % PIEZAS_ROBOT.length), MS_POR_PIEZA);
    return () => clearInterval(id);
  }, [anda, encima]);

  const iluminada = encima ?? activa;

  return (
    <section
      ref={seccion}
      aria-labelledby="titulo-robot"
      className="overflow-x-clip bg-white py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="aparecer grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Etiqueta>Pieza a pieza</Etiqueta>
            <h2 id="titulo-robot" className="titular-cartel mt-4 text-5xl font-medium sm:text-7xl">
              Así es un robot por dentro.
            </h2>
          </div>
          <p className="max-w-md font-serif text-lg leading-snug text-tinta/80 sm:text-xl">
            Cinco piezas y ya se mueve. Todas vienen en la caja, y el curso te explica para qué
            sirve cada una.
          </p>
        </div>

        {/* Mosaico en ordenador (la placa, en grande); fila que se desliza en el móvil */}
        <ol
          aria-label="Las piezas de un robot"
          onPointerLeave={() => setEncima(null)}
          className="-mx-4 mt-12 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:grid-rows-2 lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {PIEZAS_ROBOT.map((pieza, i) => {
            const foto = FOTOS[pieza.id];
            const grande = pieza.id === "placa";
            const esta = i === iluminada;
            return (
              <li
                key={pieza.id}
                onPointerEnter={(e) => e.pointerType === "mouse" && setEncima(i)}
                className={cn(
                  "relative flex w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-recto bg-niebla p-5 transition-[box-shadow,translate,background-color] duration-500 sm:w-[46%] lg:w-auto",
                  grande && "lg:col-span-2 lg:row-span-2",
                  esta
                    ? "-translate-x-1 -translate-y-1 bg-white shadow-[6px_6px_0_var(--color-acento)] ring-1 ring-tinta/15"
                    : "ring-1 ring-transparent",
                )}
              >
                <div className="flex items-baseline justify-between gap-3 font-mono text-xs">
                  <span className={esta ? "text-acento" : "text-tinta/60"}>0{i + 1}</span>
                  <span className="truncate text-tinta/60">{foto.dato}</span>
                </div>
                <div
                  className={cn(
                    "relative my-4 flex flex-1 items-center justify-center",
                    grande ? "min-h-48 lg:min-h-80" : "min-h-36",
                  )}
                >
                  {/* Línea de escáner que barre la foto de la pieza activa */}
                  {esta && (
                    <span
                      aria-hidden="true"
                      className="escaner pointer-events-none absolute inset-x-0 h-px bg-acento/70"
                    />
                  )}
                  <Image
                    src={foto.src}
                    alt={foto.alt}
                    width={grande ? 360 : 200}
                    height={grande ? 360 : 200}
                    unoptimized
                    className={cn(
                      "render-vivo h-auto transition-[scale,rotate] duration-700",
                      grande ? "w-3/4 max-w-80" : "w-2/3 max-w-44",
                      esta ? "scale-105 -rotate-3" : "scale-95 rotate-0",
                    )}
                  />
                </div>
                <h3 className="text-2xl font-medium tracking-tight">{pieza.titulo}</h3>
                <p className="mt-1.5 text-sm text-gris">{pieza.texto}</p>
              </li>
            );
          })}
        </ol>

        <Link
          href="/configurador"
          className="group mt-8 inline-flex items-center gap-2 font-mono text-xs text-tinta/70 hover:text-acento"
        >
          ¿Quieres elegirlas tú? Ábrelas en el configurador
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 transition-transform group-hover:translate-x-1"
          />
        </Link>
      </div>
    </section>
  );
}
