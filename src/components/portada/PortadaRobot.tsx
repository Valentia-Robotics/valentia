"use client";

import { useEffect, useRef, useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { cn } from "@/lib/utils";
import type { EscenaRobot } from "./escenaRobot";
import { PIEZAS_ROBOT, explosionDesdeProgreso, piezaActiva, type PiezaRobot } from "./piezasRobot";
import { RobotEstatico } from "./RobotEstatico";

/** ¿Puede este equipo con el 3D sin ir a tirones ni gastar mucha batería? */
function equipoAdmite3D(): boolean {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return false; // "ahorro de datos" activado
  if ((nav.hardwareConcurrency ?? 8) < 4) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return false;
  try {
    const prueba = document.createElement("canvas");
    return Boolean(prueba.getContext("webgl2") ?? prueba.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Ejecuta algo cuando el navegador esté desocupado (después de pintar la página) */
function cuandoEsteLibre(tarea: () => void): () => void {
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(tarea, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(tarea, 400);
  return () => clearTimeout(id);
}

/**
 * PORTADA: el robot protagonista.
 * En ordenador (y sin "reducir movimiento") la sección es alta y su contenido se queda fijo
 * mientras haces scroll: el robot gira, se despieza y se explica cada pieza.
 *   - Con un equipo capaz: robot en 3D (three.js), cargado después de pintar la página.
 *   - Si no: el mismo robot en SVG, que se despieza con CSS.
 * En el móvil o con "reducir movimiento": portada normal con el dibujo montado y la lista de piezas.
 */
export function PortadaRobot() {
  const seccion = useRef<HTMLElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const escena = useRef<EscenaRobot | null>(null);
  const [modoScroll, setModoScroll] = useState(false);
  const [tres, setTres] = useState(false); // el 3D ya está listo
  const [activa, setActiva] = useState<PiezaRobot["id"] | null>(null);
  const [alInicio, setAlInicio] = useState(true);

  // 1. ¿Portada animada con el scroll? (las mismas condiciones que el CSS: sin reduced-motion)
  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const actualizar = () => setModoScroll(consulta.matches);
    actualizar();
    consulta.addEventListener("change", actualizar);
    return () => consulta.removeEventListener("change", actualizar);
  }, []);

  // 2. Avance del scroll → despiece (variable CSS --e para el SVG y progreso para el 3D)
  useEffect(() => {
    const elemento = seccion.current;
    if (!modoScroll || !elemento) return;
    let pendiente = 0;
    const calcular = () => {
      pendiente = 0;
      const caja = elemento.getBoundingClientRect();
      const recorrido = caja.height - window.innerHeight;
      const progreso = recorrido > 0 ? Math.min(1, Math.max(0, -caja.top / recorrido)) : 0;
      elemento.style.setProperty("--e", explosionDesdeProgreso(progreso).toFixed(3));
      escena.current?.ponerProgreso(progreso);
      setActiva(piezaActiva(progreso));
      setAlInicio(progreso < 0.04);
    };
    const alMover = () => {
      if (!pendiente) pendiente = requestAnimationFrame(calcular);
    };
    calcular();
    window.addEventListener("scroll", alMover, { passive: true });
    window.addEventListener("resize", alMover);
    return () => {
      cancelAnimationFrame(pendiente);
      window.removeEventListener("scroll", alMover);
      window.removeEventListener("resize", alMover);
      elemento.style.removeProperty("--e");
      setActiva(null);
    };
  }, [modoScroll]);

  // 3. Carga diferida del 3D (solo en modo scroll y en equipos capaces)
  useEffect(() => {
    const elemento = seccion.current;
    if (!modoScroll || !elemento || !equipoAdmite3D()) return;
    let cancelado = false;
    let visible = true;

    const observador = new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting;
      escena.current?.pausar(!visible);
    });
    observador.observe(elemento);

    const cancelarEspera = cuandoEsteLibre(async () => {
      try {
        const { crearEscenaRobot } = await import("./escenaRobot");
        if (cancelado || !lienzo.current) return;
        // En el móvil, sombras más ligeras (gasta menos batería y va fluido)
        const ligero = window.matchMedia("(max-width: 63.99rem)").matches;
        escena.current = crearEscenaRobot(lienzo.current, undefined, { ligero });
        escena.current.pausar(!visible);
        window.dispatchEvent(new Event("scroll")); // para que reciba el progreso actual
        setTres(true);
      } catch (error) {
        console.warn("No se ha podido cargar el robot en 3D; se queda el dibujo.", error);
      }
    });

    return () => {
      cancelado = true;
      cancelarEspera();
      observador.disconnect();
      escena.current?.destruir();
      escena.current = null;
      setTres(false);
    };
  }, [modoScroll]);

  return (
    <section
      ref={seccion}
      aria-labelledby="titulo-portada"
      data-pieza-activa={tres ? undefined : (activa ?? undefined)}
      className="relative bg-white motion-safe:h-[320vh]"
    >
      {/* En el móvil, svh (alto con la barra del navegador visible): así el lienzo no cambia de
          tamaño cuando la barra se esconde al hacer scroll */}
      <div className="overflow-hidden motion-safe:sticky motion-safe:top-nav motion-safe:h-[calc(100svh-var(--spacing-nav))] lg:motion-safe:h-[calc(100dvh-var(--spacing-nav))]">
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-8 px-4 pt-12 pb-16 motion-safe:gap-4 motion-safe:pt-6 motion-safe:pb-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-8 lg:py-8 lg:motion-safe:gap-8 lg:motion-safe:py-8">
          {/* ---------- Texto ---------- */}
          <div className="text-center lg:text-left">
            <p className="animate-entrada text-sm font-medium tracking-wide text-acento uppercase">
              Kits de robótica con curso incluido
            </p>
            <h1
              id="titulo-portada"
              className="mt-3 animate-entrada text-5xl font-medium [animation-delay:80ms] motion-safe:text-[2.6rem] sm:text-6xl motion-safe:sm:text-6xl xl:text-7xl motion-safe:xl:text-7xl"
            >
              Construye tu propio robot.
            </h1>
            {/* En móviles bajitos se omite en la versión animada, para dejar sitio al robot */}
            <p className="mt-4 animate-entrada text-lg text-gris [animation-delay:160ms] motion-safe:mt-3 motion-safe:text-base sm:text-xl motion-safe:sm:text-xl max-lg:[@media(max-height:44rem)]:motion-safe:hidden">
              No hace falta saber programar: cada kit trae todas las piezas y un curso en vídeo que
              te guía paso a paso, hasta que lo ves moverse.
            </p>
            <div className="mt-7 flex animate-entrada flex-wrap items-center justify-center gap-x-6 gap-y-3 [animation-delay:240ms] motion-safe:mt-5 lg:justify-start lg:motion-safe:mt-7">
              <Boton href="/kits" variante="acento" tamano="lg">
                Ver los kits
              </Boton>
              <Boton href="/configurador" variante="enlace" tamano="lg">
                Crear mi robot ›
              </Boton>
            </div>

            {/* Las piezas: en ordenador se iluminan según el scroll; en el móvil, una lista */}
            <ol
              aria-label="Las piezas de un robot"
              className="mt-10 hidden gap-3 text-left lg:grid"
            >
              {PIEZAS_ROBOT.map((pieza, i) => (
                <li
                  key={pieza.id}
                  className={cn(
                    "rounded-control border-l-2 py-1 pl-4 transition-[opacity,border-color] duration-500",
                    !modoScroll || activa === pieza.id
                      ? "border-acento opacity-100"
                      : "border-linea opacity-40",
                  )}
                >
                  <p className="font-titulo text-lg font-medium">
                    <span className="mr-2 text-sm text-acento tabular-nums">0{i + 1}</span>
                    {pieza.titulo}
                  </p>
                  <p
                    className={cn(
                      "text-sm text-gris transition-[opacity,max-height] duration-500",
                      modoScroll && activa !== pieza.id && "max-h-0 overflow-hidden opacity-0",
                    )}
                  >
                    {pieza.texto}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* ---------- Robot ---------- */}
          <div className="relative mx-auto aspect-[32/21] w-full max-w-2xl animate-entrada [animation-delay:320ms] motion-safe:min-h-0 motion-safe:flex-1 max-lg:motion-safe:aspect-auto lg:max-w-none">
            <RobotEstatico
              className={cn(
                "absolute inset-0 size-full transition-opacity duration-700",
                tres && "opacity-0",
              )}
            />
            <canvas
              ref={lienzo}
              aria-hidden="true"
              className={cn(
                // En el móvil ocupa todo el ancho de la pantalla; en el ordenador, algo más que su hueco
                // will-change: el lienzo va en su propia capa (se redibuja en cada fotograma y lleva máscara)
                "absolute inset-y-0 -left-4 h-full w-[calc(100%+2rem)] transition-opacity duration-700 will-change-transform sm:-left-6 sm:w-[calc(100%+3rem)] lg:inset-[-12%] lg:size-[124%]",
                tres ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              // Bordes difuminados: al acercarse a una pieza, lo que se sale del lienzo no queda cortado en seco
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent), linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
                maskComposite: "intersect",
              }}
            />
          </div>

          {/* Móvil animado: la pieza de la que se habla, en una tarjeta de alto fijo (sin saltos) */}
          <PiezaMovil activa={modoScroll ? activa : null} />

          {/* Lista de piezas en el móvil sin animaciones */}
          <ol
            aria-label="Las piezas de un robot"
            className="grid gap-3 motion-safe:hidden sm:grid-cols-2 lg:hidden"
          >
            {PIEZAS_ROBOT.map((pieza, i) => (
              <li key={pieza.id} className="aparecer rounded-tarjeta bg-niebla p-4">
                <p className="font-titulo text-lg font-medium">
                  <span className="mr-2 text-sm text-acento tabular-nums">0{i + 1}</span>
                  {pieza.titulo}
                </p>
                <p className="mt-1 text-sm text-gris">{pieza.texto}</p>
              </li>
            ))}
          </ol>
        </div>

        {modoScroll && (
          <p
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 bottom-6 hidden text-center text-xs tracking-wide text-gris uppercase transition-opacity duration-500 lg:block",
              !alInicio && "opacity-0",
            )}
          >
            Desliza para desmontarlo ↓
          </p>
        )}
      </div>
    </section>
  );
}

/** Tarjeta de la pieza activa en el móvil: cambia con un fundido según el scroll */
function PiezaMovil({ activa }: { activa: PiezaRobot["id"] | null }) {
  const indice = PIEZAS_ROBOT.findIndex((p) => p.id === activa);
  return (
    <div
      aria-live="polite"
      className="relative hidden h-24 shrink-0 motion-safe:block lg:motion-safe:hidden"
    >
      <p
        className={cn(
          "absolute inset-0 flex items-center justify-center text-xs tracking-wide text-gris uppercase transition-opacity duration-500",
          indice >= 0 && "opacity-0",
        )}
      >
        Desliza para desmontarlo ↓
      </p>
      {PIEZAS_ROBOT.map((pieza, i) => (
        <div
          key={pieza.id}
          aria-hidden={i !== indice}
          className={cn(
            "absolute inset-0 rounded-tarjeta bg-niebla px-4 py-3 transition-[opacity,translate] duration-500",
            i === indice
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="font-titulo text-lg font-medium">
              <span className="mr-2 text-sm text-acento tabular-nums">0{i + 1}</span>
              {pieza.titulo}
            </p>
            {/* Puntos de avance: cuántas piezas quedan */}
            <span aria-hidden="true" className="flex gap-1">
              {PIEZAS_ROBOT.map((p, j) => (
                <span
                  key={p.id}
                  className={cn("size-1.5 rounded-full", j <= i ? "bg-acento" : "bg-linea")}
                />
              ))}
            </span>
          </div>
          <p className="mt-1 text-sm leading-snug text-gris">{pieza.texto}</p>
        </div>
      ))}
    </div>
  );
}
