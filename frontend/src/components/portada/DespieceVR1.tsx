"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Boton } from "@/components/ui/Boton";
import { Led } from "@/components/ui/Led";
import { Cruces } from "@/components/ui/MarcoCAD";
import { TablaDatos } from "@/components/ui/TablaDatos";
import { CAPAS_VR1 } from "@/config/despieceVR1";
import { datosDelAparato, elegirCalidad, type NivelCalidad } from "@/lib/visor3d/calidad";
import { cn, formatearPrecio } from "@/lib/utils";
import type { Anclas, EscenaDespiece } from "./escenaDespiece";

/** Tramos del scroll por la sección (0 = arriba del todo, 1 = al acabar) */
const ABRE = [0.04, 0.16] as const;
const CIERRA = [0.86, 0.96] as const;
/** Columna de cada capa en pantallas anchas (según dónde cae la pieza al abrirse) */
const COLUMNA: Record<(typeof CAPAS_VR1)[number]["id"], "izq" | "der"> = {
  chasis: "izq",
  placa: "der",
  motores: "izq",
  sensores: "der",
  bateria: "izq",
};
const ANCHO_ETIQUETA = 304;

function suave(desde: number, hasta: number, v: number) {
  const t = Math.min(1, Math.max(0, (v - desde) / (hasta - desde)));
  return t * t * (3 - 2 * t);
}
const aperturaDe = (p: number) => suave(ABRE[0], ABRE[1], p) * (1 - suave(CIERRA[0], CIERRA[1], p));
function capaDe(p: number): number | null {
  const inicio = ABRE[1] - 0.01;
  const fin = CIERRA[0];
  if (p < inicio || p > fin) return null;
  return Math.min(
    CAPAS_VR1.length - 1,
    Math.floor(((p - inicio) / (fin - inicio)) * CAPAS_VR1.length),
  );
}
const dos = (n: number) => String(n).padStart(2, "0");

export interface LineaBom {
  cantidad: number;
  nombre: string;
}

/**
 * La foto del taller (abuelo y nieta en la mesa de trabajo): el fondo grande de la primera pantalla.
 * Su encaje (object-position) es el de ENCUADRE en escenaDespiece.ts: si cambia aquí, cambiarlo allí.
 */
const fotoTaller = (
  <Image
    src="/images/portada/taller-fondo.webp"
    alt=""
    fill
    priority
    sizes="100vw"
    className="object-cover object-[44%_100%] lg:object-[50%_100%]"
  />
);

/**
 * PRIMERA PANTALLA DE LA PORTADA: la foto del taller de fondo (con profundidad: se mueve en 3D con el
 * ratón) y el VR1 en 3D apoyado en su mesa, delante de la niña. Montado, junto al cajetín del plano (titular, datos y botones). Al bajar se despieza por
 * capas y cada una sale con su línea de cota y sus datos en mono; al final se vuelve a montar con su
 * lista de materiales. Sin WebGL o con «reducir movimiento»: la foto, el coche en imagen y las cinco
 * capas en tablas (mismo contenido).
 */
export function DespieceVR1({
  precioCentimos,
  bom,
  lecciones,
  compraAbierta,
}: {
  precioCentimos: number | null;
  bom: LineaBom[];
  lecciones: number | null;
  compraAbierta: boolean;
}) {
  const seccion = useRef<HTMLElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const etiquetas = useRef<(HTMLDivElement | null)[]>([]);
  const lineas = useRef<(SVGPathElement | null)[]>([]);
  const puntos = useRef<(SVGCircleElement | null)[]>([]);
  const capaSvg = useRef<SVGSVGElement>(null);
  const alturas = useRef<number[]>(CAPAS_VR1.map(() => 56));
  const [listo, setListo] = useState(false);
  const [con3d, setCon3d] = useState(true);
  const [progreso, setProgreso] = useState(0);

  /** Coloca etiquetas y líneas de cota según dónde cae cada capa (se llama en cada fotograma) */
  const disponer = useCallback((anclas: Anclas, apertura: number) => {
    const canvas = lienzo.current;
    if (!canvas) return;
    const ancho = canvas.clientWidth;
    const alto = canvas.clientHeight;
    const ancha = ancho >= 1024;
    const visible = suave(0.55, 0.95, apertura);
    if (capaSvg.current) capaSvg.current.style.opacity = String(visible);

    if (ancha) {
      // Dos columnas a los lados; en cada una, de arriba abajo según la altura de su pieza
      const margen = Math.max(24, (ancho - 1280) / 2 + 24);
      const arriba = 104;
      const abajo = alto - 96;
      for (const lado of ["izq", "der"] as const) {
        const indices = CAPAS_VR1.map((c, i) => ({ c, i }))
          .filter(({ c }) => COLUMNA[c.id] === lado)
          .sort((a, b) => anclas[a.c.id].y - anclas[b.c.id].y)
          .map(({ i }) => i);
        const ys = indices.map((i) => anclas[CAPAS_VR1[i].id].y - 22);
        // Sin solaparse: hacia abajo y, si se salen, hacia arriba
        for (let k = 0; k < ys.length; k++) {
          const previo = k > 0 ? ys[k - 1] + alturas.current[indices[k - 1]] + 14 : arriba;
          ys[k] = Math.max(ys[k], previo);
        }
        for (let k = ys.length - 1; k >= 0; k--) {
          const limite =
            k < ys.length - 1 ? ys[k + 1] - 14 - alturas.current[indices[k]] : abajo - alturas.current[indices[k]];
          ys[k] = Math.max(arriba, Math.min(ys[k], limite));
        }
        indices.forEach((i, k) => {
          const x = lado === "izq" ? margen : ancho - margen - ANCHO_ETIQUETA;
          const y = ys[k];
          const etiqueta = etiquetas.current[i];
          if (etiqueta) {
            etiqueta.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            etiqueta.style.opacity = String(visible);
          }
          const { x: ax, y: ay } = anclas[CAPAS_VR1[i].id];
          const tx = lado === "izq" ? x + ANCHO_ETIQUETA : x;
          const ty = y + 22;
          const codo = tx + (lado === "izq" ? 40 : -40);
          lineas.current[i]?.setAttribute("d", `M${ax},${ay}L${codo},${ty}L${tx},${ty}`);
          puntos.current[i]?.setAttribute("cx", String(ax));
          puntos.current[i]?.setAttribute("cy", String(ay));
        });
      }
      return;
    }

    // Móvil: un número junto a cada pieza, hacia fuera del coche
    let cx = 0;
    let cy = 0;
    for (const c of CAPAS_VR1) {
      cx += anclas[c.id].x / CAPAS_VR1.length;
      cy += anclas[c.id].y / CAPAS_VR1.length;
    }
    CAPAS_VR1.forEach((c, i) => {
      const { x: ax, y: ay } = anclas[c.id];
      let dx = ax - cx;
      let dy = ay - cy;
      const largo = Math.hypot(dx, dy) || 1;
      dx /= largo;
      dy /= largo;
      const x = Math.min(ancho - 40, Math.max(8, ax + dx * 44 - 16));
      const y = Math.min(alto - 40, Math.max(64, ay + dy * 44 - 12));
      const etiqueta = etiquetas.current[i];
      if (etiqueta) {
        etiqueta.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        etiqueta.style.opacity = String(visible);
      }
      lineas.current[i]?.setAttribute("d", `M${ax},${ay}L${x + 16},${y + 12}`);
      puntos.current[i]?.setAttribute("cx", String(ax));
      puntos.current[i]?.setAttribute("cy", String(ay));
    });
  }, []);

  // Alto real de cada etiqueta (la activa se despliega con su tabla)
  useEffect(() => {
    const observador = new ResizeObserver(() => {
      etiquetas.current.forEach((e, i) => {
        if (e) alturas.current[i] = e.offsetHeight;
      });
    });
    etiquetas.current.forEach((e) => e && observador.observe(e));
    return () => observador.disconnect();
  }, []);

  // Preparar el 3D cuando la página ya se ve (la foto es lo primero que se pinta)
  useEffect(() => {
    const canvas = lienzo.current;
    const caja = seccion.current;
    if (!canvas || !caja) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sinWebgl = !document.createElement("canvas").getContext("webgl2");
    // Calidad según el aparato; ?calidad=alta|media|baja|foto en la dirección la fuerza (para comparar)
    const pedida = new URLSearchParams(window.location.search).get("calidad");
    const calidad: NivelCalidad = ["alta", "media", "baja", "foto"].includes(pedida ?? "")
      ? (pedida as NivelCalidad)
      : sinWebgl
        ? "foto"
        : elegirCalidad(datosDelAparato());
    if (quieto || sinWebgl || calidad === "foto") {
      const id = requestAnimationFrame(() => setCon3d(false));
      return () => cancelAnimationFrame(id);
    }

    let escena: EscenaDespiece | null = null;
    let cancelado = false;
    let marco = 0;
    const medir = () => {
      marco = 0;
      const r = caja.getBoundingClientRect();
      const recorrido = r.height - window.innerHeight;
      const p = recorrido > 0 ? Math.min(1, Math.max(0, -r.top / recorrido)) : 0;
      setProgreso(p);
      escena?.abrir(aperturaDe(p));
      const i = capaDe(p);
      escena?.enfocar(i === null ? null : CAPAS_VR1[i].id);
    };
    const alMover = () => {
      if (!marco) marco = requestAnimationFrame(medir);
    };
    const visible = new IntersectionObserver(([e]) => escena?.pausar(!e.isIntersecting));
    const empezar = async () => {
      const { crearEscenaDespiece } = await import("./escenaDespiece");
      if (cancelado) return;
      escena = await crearEscenaDespiece(canvas, {
        calidad,
        alDibujar: disponer,
        // Ni con la calidad más baja va fluido: la foto fija, que se ve igual de bien
        alRendirse: () => {
          escena?.destruir();
          escena = null;
          setCon3d(false);
        },
      });
      if (cancelado) return escena.destruir();
      visible.observe(caja);
      medir();
      setListo(true);
    };
    const id = "requestIdleCallback" in window ? requestIdleCallback(() => void empezar()) : 0;
    if (!id) setTimeout(() => void empezar(), 200);

    window.addEventListener("scroll", alMover, { passive: true });
    window.addEventListener("resize", alMover);
    return () => {
      cancelado = true;
      if (id) cancelIdleCallback(id);
      cancelAnimationFrame(marco);
      window.removeEventListener("scroll", alMover);
      window.removeEventListener("resize", alMover);
      visible.disconnect();
      escena?.destruir();
    };
  }, [disponer]);

  const capa = capaDe(progreso);
  const intro = 1 - suave(0.015, 0.07, progreso);
  const final = suave(0.9, 0.97, progreso);
  const apertura = aperturaDe(progreso);
  const precio = precioCentimos === null ? null : formatearPrecio(precioCentimos);

  /** El cajetín del plano: titular, datos clave y botones */
  const cajetin = (
    <div className="relative border border-linea bg-papel-plano/88 p-5 backdrop-blur-[2px] sm:p-7">
      <Cruces />
      <p className="llegar mono-etiqueta text-gris" style={{ "--i": 0 } as CSSProperties}>
        <span aria-hidden="true" className="text-acento">
          {"// "}
        </span>
        SEC_00 · VR1 Starter Kit · Rev. A
      </p>
      <h1
        id="titulo-portada"
        className="llegar titular-cartel mt-3 text-[2.6rem] font-semibold sm:text-6xl xl:text-[4.25rem]"
        style={{ "--i": 1 } as CSSProperties}
      >
        Plataforma 2WD sobre ESP32.
      </h1>
      <p
        className="llegar mt-4 max-w-md text-[15px] leading-relaxed text-gris max-sm:hidden"
        style={{ "--i": 2 } as CSSProperties}
      >
        Chasis de PMMA de bajo perfil, driver L298N de doble puente H, seguimiento de línea con dos
        TCRT5000 y medida de distancia por ultrasonidos. Los módulos se acoplan con imanes y pines
        pogo: cero soldaduras.
      </p>
      <dl
        className="llegar mt-5 grid grid-cols-2 border-t border-l border-linea font-mono text-[12px] leading-snug"
        style={{ "--i": 3 } as CSSProperties}
      >
        {[
          ["MCU", "ESP32 · 240 MHz"],
          ["Alimentación", "2S 18650 · 7,4 V"],
          ["GPIO en uso", "10 de 25"],
          ["PVP", precio ? `${precio} IVA incl.` : "—"],
        ].map(([nombre, valor]) => (
          <div key={nombre} className="border-r border-b border-linea px-3 py-2">
            <dt className="mono-etiqueta text-[10px] text-gris">{nombre}</dt>
            <dd className="mt-0.5 text-tinta">{valor}</dd>
          </div>
        ))}
      </dl>
      <div
        className="llegar mt-5 flex flex-wrap items-center gap-3"
        style={{ "--i": 4 } as CSSProperties}
      >
        <Boton href="/kits/vr1-starter-kit" variante="primario" tamano="lg">
          Ficha técnica
        </Boton>
        <Boton href="/configurador" variante="secundario" tamano="lg">
          Configurador
        </Boton>
      </div>
      <p className="mt-4">
        {compraAbierta ? (
          <Led estado="ok" texto="En stock · envío 24/72 h" />
        ) : (
          <a href="#avisame" className="hover:underline">
            <Led estado="aviso" parpadeo texto="Preventa · lista de espera abierta" />
          </a>
        )}
      </p>
    </div>
  );

  // Sin 3D: el cajetín, la foto y las cinco capas en tablas
  if (!con3d)
    return (
      <section aria-labelledby="titulo-portada" className="papel bg-papel-plano">
        <div className="relative overflow-hidden">
          {fotoTaller}
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[30rem_1fr] lg:items-end">
            {cajetin}
            <Image
              src="/images/redes/kits/vr1-starter-kit.png"
              alt="VR1 Starter Kit montado"
              width={1000}
              height={592}
              priority
              className="h-auto w-full max-w-[34rem] justify-self-center lg:translate-y-[22%]"
            />
          </div>
        </div>
        <ol className="mx-auto grid max-w-6xl gap-px px-4 pb-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {CAPAS_VR1.map((c, i) => (
            <li key={c.id} className="pt-6">
              <p className="mono-etiqueta text-gris">
                {dos(i + 1)} · {c.nombre}
              </p>
              <TablaDatos filas={c.datos} densa className="mt-3" />
            </li>
          ))}
        </ol>
      </section>
    );

  return (
    <section
      ref={seccion}
      aria-labelledby="titulo-portada"
      className="papel relative h-[400svh] bg-papel-plano"
    >
      <div className="sticky top-nav h-[calc(100svh-var(--spacing-nav))] min-h-[34rem] overflow-hidden">
        {/* La foto del taller mientras carga el 3D; luego la pinta el lienzo, encajada igual
            (ENCUADRE en escenaDespiece.ts) y con profundidad */}
        <div aria-hidden="true" className="absolute inset-0 origin-[55%_100%] scale-[1.035]">
          {fotoTaller}
        </div>
        {/* El coche en imagen mientras carga el 3D, en el mismo sitio de la mesa */}
        <Image
          src="/images/redes/kits/vr1-starter-kit.png"
          alt=""
          width={1000}
          height={592}
          priority
          className={cn(
            "absolute bottom-[3%] left-1/2 w-[min(80vw,26rem)] -translate-x-1/2 transition-opacity duration-700 lg:left-[57%] lg:w-[30vw] lg:max-w-[30rem]",
            listo && "opacity-0",
          )}
        />
        <canvas
          ref={lienzo}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-700",
            listo ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Líneas de cota: del centro de cada pieza a su etiqueta */}
        <svg
          ref={capaSvg}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full opacity-0"
        >
          {CAPAS_VR1.map((c, i) => (
            <g key={c.id} className={cn(capa === i ? "text-acento" : "text-tinta/60")}>
              <path
                ref={(e) => {
                  lineas.current[i] = e;
                }}
                fill="none"
                stroke="currentColor"
                strokeWidth={capa === i ? 1.5 : 1}
              />
              <circle
                ref={(e) => {
                  puntos.current[i] = e;
                }}
                r={capa === i ? 4.5 : 3}
                fill="currentColor"
                stroke="#f4f4f0"
                strokeWidth={1.5}
              />
            </g>
          ))}
        </svg>

        {/* Etiquetas de cada capa (en el móvil, solo su número; sus datos van en la tarjeta de abajo) */}
        <ol aria-label="Capas del VR1" className="pointer-events-none absolute inset-0">
          {CAPAS_VR1.map((c, i) => (
            <li key={c.id}>
              <div
                ref={(e) => {
                  etiquetas.current[i] = e;
                }}
                className={cn(
                  "absolute top-0 left-0 opacity-0 will-change-transform",
                  "lg:w-[304px] lg:border lg:bg-papel-plano/92 lg:px-3.5 lg:py-2.5 lg:backdrop-blur-[2px]",
                  capa === i ? "lg:border-acento" : "lg:border-linea",
                )}
              >
                <p className="flex items-center gap-2 max-lg:hidden">
                  <span
                    className={cn(
                      "mono-etiqueta px-1 text-[10px]",
                      capa === i ? "bg-acento text-carbon" : "bg-tinta text-papel-plano",
                    )}
                  >
                    {dos(i + 1)}
                  </span>
                  <span className="mono-etiqueta text-tinta">{c.nombre}</span>
                </p>
                <p className="mt-1 font-mono text-[12px] text-gris max-lg:hidden">{c.resumen}</p>
                {/* Datos completos de la capa activa (solo en pantallas anchas) */}
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-suave max-lg:hidden",
                    capa === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <TablaDatos filas={c.datos.slice(0, 4)} densa className="mt-2.5" />
                  </div>
                </div>
                {/* Móvil: el número de la capa */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "mono-etiqueta flex h-6 w-8 items-center justify-center lg:hidden",
                    capa === i ? "bg-acento text-carbon" : "bg-tinta text-papel-plano",
                  )}
                >
                  {dos(i + 1)}
                </span>
              </div>
            </li>
          ))}
        </ol>

        {/* Montado: el cajetín (a la izquierda en pantallas anchas, arriba en el móvil) */}
        <div
          className="absolute inset-x-0 top-4 mx-auto max-w-[80rem] px-4 sm:top-8 sm:px-6 lg:top-1/2 lg:-translate-y-1/2"
          style={{ opacity: intro, visibility: intro < 0.02 ? "hidden" : undefined }}
        >
          <div className="max-w-[30rem]">{cajetin}</div>
        </div>

        {/* Despiece: encabezado del plano y avance por capas */}
        <div
          aria-hidden={apertura < 0.5}
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto flex max-w-[80rem] items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6"
          style={{ opacity: suave(0.5, 0.9, apertura) }}
        >
          <p className="mono-etiqueta bg-papel-plano/80 px-1.5 py-0.5 text-gris">
            <span className="text-acento">{"// "}</span>SEC_01 · Despiece VR1 · 5 capas
          </p>
          <p className="mono-etiqueta bg-papel-plano/80 px-1.5 py-0.5 text-tinta tabular-nums">
            Capa {dos((capa ?? 0) + 1)}/05
          </p>
        </div>

        {/* Móvil: la capa activa, con sus datos, abajo */}
        <div
          aria-live="polite"
          className="absolute inset-x-0 bottom-0 px-4 pb-4 lg:hidden"
          style={{ opacity: capa === null ? 0 : suave(0.6, 0.95, apertura) }}
        >
          {capa !== null && (
            <div className="relative border border-linea bg-papel-plano/95 p-4">
              <Cruces />
              <p className="flex items-center gap-2">
                <span className="mono-etiqueta bg-acento px-1 text-[10px] text-carbon">
                  {dos(capa + 1)}
                </span>
                <span className="mono-etiqueta text-tinta">{CAPAS_VR1[capa].nombre}</span>
              </p>
              <TablaDatos filas={CAPAS_VR1[capa].datos.slice(0, 4)} densa className="mt-3" />
            </div>
          )}
        </div>

        {/* Pantallas anchas: avance (cinco segmentos) abajo en el centro */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center max-lg:hidden"
          style={{ opacity: suave(0.5, 0.9, apertura) }}
        >
          <div className="flex items-center gap-3 bg-papel-plano/80 px-2 py-1">
            {CAPAS_VR1.map((c, i) => (
              <span key={c.id} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-[3px] w-10 transition-colors duration-150",
                    capa !== null && i <= capa ? "bg-acento" : "bg-tinta/20",
                  )}
                />
                <span
                  className={cn("mono-etiqueta text-[10px]", capa === i ? "text-tinta" : "text-gris")}
                >
                  {dos(i + 1)}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Al final, otra vez montado: su lista de materiales */}
        <div
          className="absolute inset-x-0 top-4 mx-auto max-w-[80rem] px-4 sm:top-8 sm:px-6 lg:top-1/2 lg:-translate-y-1/2"
          style={{ opacity: final, visibility: final < 0.02 ? "hidden" : undefined }}
        >
          <div className="relative max-w-[30rem] border border-linea bg-papel-plano/90 p-5 backdrop-blur-[2px] sm:p-7">
            <Cruces />
            <p className="mono-etiqueta text-gris">
              <span className="text-acento">{"// "}</span>SEC_01.1 · Lista de materiales
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {bom.reduce((n, l) => n + l.cantidad, 0)} piezas, una caja.
            </p>
            <ul className="mt-4 border-t border-linea font-mono text-[12px] max-sm:hidden">
              {bom.map((l) => (
                <li
                  key={l.nombre}
                  className="flex justify-between gap-4 border-b border-linea py-1.5"
                >
                  <span className="text-tinta">{l.nombre}</span>
                  <span className="text-gris tabular-nums">×{l.cantidad}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-[12px] text-gris">
              + 2× 18650 Li-ion · cable USB-C
              {lecciones ? ` · curso de ${lecciones} lecciones` : ""}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Boton href="/kits/vr1-starter-kit" variante="primario" tamano="lg">
                {precio ? `Ver kit · ${precio}` : "Ver kit"}
              </Boton>
            </div>
          </div>
        </div>

        {/* Saltar el despiece */}
        <a
          href="#linea-producto"
          className="mono-etiqueta absolute right-4 bottom-4 bg-papel-plano/80 px-1.5 py-0.5 text-gris transition-colors duration-100 hover:text-tinta max-lg:hidden sm:right-6"
          style={{ opacity: 1 - final }}
        >
          Saltar despiece ↓
        </a>
      </div>
    </section>
  );
}
