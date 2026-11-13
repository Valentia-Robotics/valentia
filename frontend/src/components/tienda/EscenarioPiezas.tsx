"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Ver3dPieza } from "@/components/configurador/Ver3dPieza";
import { categorias } from "@/config/categorias";
import { formatearPrecio } from "@/lib/utils";
import type { ComponenteCatalogo } from "@/types/catalogo";

/** La pieza que mejor representa cada apartado (si no está, la primera con 3D de la categoría) */
const REFERENCIA: Record<string, string> = {
  PLACAS: "arduino-uno-r3",
  MOTORES: "motor-dc-reductora",
  SENSORES: "sensor-ultrasonidos-hc-sr04",
  ALIMENTACION: "bateria-18650-2s",
  CHASIS: "chasis-coche-2wd",
  EXTRAS: "pantalla-oled-096",
};

/**
 * Escenario negro de la portada: a la izquierda los apartados del configurador, a la derecha la pieza
 * de referencia de cada uno sobre un estudio oscuro (foco de luz, suelo con reflejo). La pieza se
 * inclina un poco hacia el ratón y se abre en 3D (visor de Visualizalo) con el botón de debajo.
 * Sin ratón o con «reducir movimiento», la pieza se queda quieta.
 */
export function EscenarioPiezas({ componentes }: { componentes: ComponenteCatalogo[] }) {
  const [activa, setActiva] = useState(0);
  const pieza = useRef<HTMLDivElement>(null);

  const apartados = categorias.map((c) => {
    const delApartado = componentes.filter((p) => p.categoria === c.id);
    const elegida =
      delApartado.find((p) => p.slug === REFERENCIA[c.id]) ??
      delApartado.find((p) => p.imagen) ??
      null;
    return { ...c, pieza: elegida, cuantas: delApartado.length };
  });
  const actual = apartados[activa];

  function inclinar(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !pieza.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    pieza.current.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
    pieza.current.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`);
  }
  function soltar() {
    pieza.current?.style.setProperty("--rx", "0deg");
    pieza.current?.style.setProperty("--ry", "0deg");
  }

  return (
    <div className="aparecer mt-14 grid gap-px overflow-hidden rounded-recto bg-white/10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Los apartados */}
      <ul
        role="tablist"
        aria-label="Apartados del configurador"
        className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-3 lg:grid-cols-1"
      >
        {apartados.map(({ id, nombre, icono: Icono, cuantas }, i) => (
          <li key={id} className="contents">
            <button
              type="button"
              role="tab"
              aria-selected={i === activa}
              onClick={() => setActiva(i)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActiva(i)}
              className={`flex items-center gap-3 bg-tinta px-4 py-4 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cobre sm:gap-4 sm:px-5 sm:px-6 lg:py-5 ${
                i === activa ? "bg-grafito" : "hover:bg-grafito/60"
              }`}
            >
              <span className="hidden font-mono text-xs text-white/40 sm:inline">0{i + 1}</span>
              <Icono
                aria-hidden="true"
                className={`size-5 transition-colors ${i === activa ? "text-cobre" : "text-white/50"}`}
                strokeWidth={1.5}
              />
              <span className="flex-1 text-base leading-tight text-white sm:text-lg">{nombre}</span>
              <span className="hidden font-mono text-xs text-white/40 sm:inline">
                {cuantas} piezas
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* El escenario */}
      <div
        className="relative isolate min-h-[22rem] overflow-hidden bg-tinta sm:min-h-[28rem]"
        onPointerMove={inclinar}
        onPointerLeave={soltar}
        role="tabpanel"
      >
        {/* Foco de estudio y suelo con reflejo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 55% 50% at 50% 42%, rgb(255 255 255 / 0.11), transparent 70%), radial-gradient(ellipse 60% 14% at 50% 82%, rgb(216 167 67 / 0.14), transparent 75%), linear-gradient(to bottom, #0b0b0b 0%, #050505 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-2/5 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgb(255 255 255 / 0.12) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.12) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            transform: "perspective(500px) rotateX(62deg)",
            transformOrigin: "bottom",
            maskImage: "linear-gradient(to top, black, transparent)",
          }}
        />
        <p className="absolute top-4 left-5 font-mono text-[11px] tracking-wide text-white/40 uppercase">
          Pieza de referencia · {actual.nombre}
        </p>

        {actual.pieza ? (
          <div className="relative flex h-full min-h-[22rem] flex-col items-center justify-center px-6 pt-10 pb-24 sm:min-h-[28rem]">
            <div
              ref={pieza}
              key={actual.id}
              className="animate-tarjeta transition-transform duration-200 ease-out motion-reduce:transform-none"
              style={{
                transform: "perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
              }}
            >
              <Image
                src={actual.pieza.imagen}
                alt={actual.pieza.nombre}
                width={420}
                height={420}
                unoptimized
                className="render-vivo pieza-balanceo size-64 object-contain drop-shadow-[0_30px_30px_rgb(0_0_0/0.7)] sm:size-80"
              />
            </div>
            <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-3 px-4 text-center">
              <p className="text-white">
                {actual.pieza.nombre}
                <span className="ml-3 font-mono text-sm text-white/50">
                  {formatearPrecio(actual.pieza.precioCentimos)}
                </span>
              </p>
              <div className="relative h-8 w-28">
                <Ver3dPieza
                  componente={actual.pieza}
                  className="top-0 right-auto left-0 h-8 w-28 justify-center bg-white text-tinta"
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="flex h-full min-h-[22rem] items-center justify-center text-white/50">
            Pronto, más piezas aquí.
          </p>
        )}
      </div>
    </div>
  );
}
