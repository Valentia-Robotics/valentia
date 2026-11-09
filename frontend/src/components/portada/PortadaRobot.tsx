"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Etiqueta } from "./Etiqueta";
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
    const id = window.requestIdleCallback(tarea, { timeout: 600 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(tarea, 400);
  return () => clearTimeout(id);
}

/**
 * PORTADA (2.ª pantalla, tras HeroPortada): el robot que se desmonta.
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
  // Este equipo no puede con el 3D (o falló al cargar): se enseña el dibujo SVG
  const [sin3d, setSin3d] = useState(false);
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
    // --e solo hace falta con el dibujo SVG: cambiarla en cada fotograma obliga al navegador a
    // recalcular los estilos de toda la portada, y con el 3D eso era trabajo tirado (tirones en el móvil)
    const conDibujo = sin3d;
    let pendiente = 0;
    const calcular = () => {
      pendiente = 0;
      const caja = elemento.getBoundingClientRect();
      const recorrido = caja.height - window.innerHeight;
      const progreso = recorrido > 0 ? Math.min(1, Math.max(0, -caja.top / recorrido)) : 0;
      if (conDibujo) elemento.style.setProperty("--e", explosionDesdeProgreso(progreso).toFixed(3));
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
  }, [modoScroll, sin3d]);

  // 3. Carga diferida del 3D (solo en modo scroll y en equipos capaces)
  useEffect(() => {
    const elemento = seccion.current;
    if (!modoScroll || !elemento) return;
    let cancelado = false;
    let visible = true;

    const observador = new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting;
      escena.current?.pausar(!visible);
    });
    observador.observe(elemento);

    const cancelarEspera = cuandoEsteLibre(async () => {
      if (!equipoAdmite3D()) {
        setSin3d(true);
        return;
      }
      try {
        const { crearEscenaRobot } = await import("./escenaRobot");
        if (cancelado || !lienzo.current) return;
        // En el móvil, sombras más ligeras (gasta menos batería y va fluido)
        const ligero = window.matchMedia("(max-width: 63.99rem)").matches;
        // Se prepara a trozos, dejando respirar a la página entre uno y otro
        const nueva = await crearEscenaRobot(lienzo.current, undefined, { ligero });
        if (cancelado) {
          nueva.destruir();
          return;
        }
        escena.current = nueva;
        escena.current.pausar(!visible);
        window.dispatchEvent(new Event("scroll")); // para que reciba el progreso actual
        setTres(true);
      } catch (error) {
        console.warn("No se ha podido cargar el robot en 3D; se queda el dibujo.", error);
        if (!cancelado) setSin3d(true);
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
      aria-labelledby="titulo-robot"
      data-pieza-activa={sin3d ? (activa ?? undefined) : undefined}
      // Alta para que cada pieza dure un buen tramo de scroll (antes pasaba de una a otra muy rápido)
      className="portada-robot relative bg-white motion-safe:h-[620vh]"
    >
      {/* En el móvil, svh (alto con la barra del navegador visible): así el lienzo no cambia de
          tamaño cuando la barra se esconde al hacer scroll */}
      <div className="overflow-hidden motion-safe:sticky motion-safe:top-nav motion-safe:h-[calc(100svh-var(--spacing-nav))] lg:motion-safe:h-[calc(100dvh-var(--spacing-nav))]">
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-8 px-4 pt-12 pb-16 motion-safe:gap-4 motion-safe:pt-6 motion-safe:pb-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-8 lg:py-8 lg:motion-safe:gap-8 lg:motion-safe:py-8">
          {/* ---------- Texto ---------- */}
          {/* Por encima del lienzo: al acercarse a una pieza, el 3D no tapa el texto */}
          <div className="relative z-10 text-center lg:text-left">
            <Etiqueta className="[&>span:first-child]:mx-auto lg:[&>span:first-child]:mx-0">
              Pieza a pieza
            </Etiqueta>
            <h2
              id="titulo-robot"
              className="titular-cartel mt-4 text-5xl font-medium motion-safe:text-[2.6rem] sm:text-6xl motion-safe:sm:text-6xl xl:text-7xl motion-safe:xl:text-7xl"
            >
              Así es un robot por dentro.
            </h2>
            {/* En móviles bajitos se omite en la versión animada, para dejar sitio al robot */}
            <p className="mt-4 font-serif text-lg leading-snug text-tinta/80 motion-safe:mt-3 sm:text-xl max-lg:[@media(max-height:44rem)]:motion-safe:hidden">
              Desliza y el coche se desmonta. Cada pieza que ves va en la caja, y el curso te
              explica para qué sirve.
            </p>

            {/* Las piezas: en ordenador se iluminan según el scroll; en el móvil, una lista */}
            <ol
              aria-label="Las piezas de un robot"
              className="mt-10 hidden gap-3 text-left lg:grid"
            >
              {PIEZAS_ROBOT.map((pieza, i) => (
                <li
                  key={pieza.id}
                  className={cn(
                    "border-l-2 py-1 pl-4 transition-[opacity,border-color] duration-500",
                    !modoScroll || activa === pieza.id
                      ? "border-acento opacity-100"
                      : "border-linea opacity-40",
                  )}
                >
                  <p className="font-titulo text-lg font-medium">
                    <span className="mr-2 font-mono text-xs text-acento">0{i + 1}</span>
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
            {/* El dibujo solo sale si no hay 3D (reducir movimiento, equipo lento o error). Mientras
                carga el 3D el hueco queda vacío: así no se ve el dibujo antiguo un momento al recargar */}
            <RobotEstatico
              className={cn(
                "absolute inset-0 size-full transition-opacity duration-700",
                !sin3d && "motion-safe:opacity-0",
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
              <li key={pieza.id} className="aparecer rounded-recto bg-salvia p-4">
                <p className="font-titulo text-lg font-medium">
                  <span className="mr-2 font-mono text-xs text-acento">0{i + 1}</span>
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
              "absolute inset-x-0 bottom-6 hidden text-center font-mono text-xs text-gris transition-opacity duration-500 lg:block",
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
          "absolute inset-0 flex items-center justify-center font-mono text-xs text-gris transition-opacity duration-500",
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
            "absolute inset-0 rounded-recto bg-salvia px-4 py-3 transition-[opacity,translate] duration-500",
            i === indice
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="font-titulo text-lg font-medium">
              <span className="mr-2 font-mono text-xs text-acento">0{i + 1}</span>
              {pieza.titulo}
            </p>
            {/* Puntos de avance: cuántas piezas quedan */}
            <span aria-hidden="true" className="flex gap-1">
              {PIEZAS_ROBOT.map((p, j) => (
                <span key={p.id} className={cn("size-1.5", j <= i ? "bg-acento" : "bg-tinta/15")} />
              ))}
            </span>
          </div>
          <p className="mt-1 text-sm leading-snug text-gris">{pieza.texto}</p>
        </div>
      ))}
    </div>
  );
}
