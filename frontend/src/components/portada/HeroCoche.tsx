"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { cn } from "@/lib/utils";
import type { EscenaCoche } from "./escenaCoche";
import type { PiezaRobot } from "./piezasRobot";

/** Lo que se cuenta de cada pieza mientras el coche está abierto: una idea, pocas palabras */
const PIEZAS: { id: PiezaRobot["id"]; titulo: string; texto: string }[] = [
  { id: "chasis", titulo: "El chasis", texto: "La base. Todo encaja encima, sin soldar." },
  { id: "placa", titulo: "La placa", texto: "El cerebro. Hace lo que tú le enseñes." },
  { id: "motores", titulo: "Motores y ruedas", texto: "Para avanzar, girar y frenar." },
  {
    id: "sensores",
    titulo: "Los sensores",
    texto: "Sus ojos: ven la línea del suelo y lo que hay delante.",
  },
  { id: "bateria", titulo: "Las baterías", texto: "Recargables. Vienen en la caja." },
];

/** Tramos del scroll por la portada (0 = arriba del todo, 1 = al acabar la sección) */
const ABRE = [0.08, 0.22] as const;
const CIERRA = [0.82, 0.94] as const;

function suave(desde: number, hasta: number, v: number) {
  const t = Math.min(1, Math.max(0, (v - desde) / (hasta - desde)));
  return t * t * (3 - 2 * t);
}

/** Cuánto está abierto el coche según el scroll */
function aperturaDe(p: number) {
  return suave(ABRE[0], ABRE[1], p) * (1 - suave(CIERRA[0], CIERRA[1], p));
}

/** Qué pieza se cuenta ahora (o null al principio y al final) */
function piezaDe(p: number): number | null {
  const inicio = ABRE[1] - 0.02;
  const fin = CIERRA[0];
  if (p < inicio || p > fin) return null;
  return Math.min(PIEZAS.length - 1, Math.floor(((p - inicio) / (fin - inicio)) * PIEZAS.length));
}

/**
 * PRIMERA PANTALLA DE LA PORTADA: el coche VR1 en 3D sobre luz de estudio. Al bajar, se abre en sus
 * piezas (una frase por pieza) y se vuelve a montar. Mientras three.js carga, o si el móvil no puede con
 * el 3D o la persona prefiere menos movimiento, se ve la foto del coche y la sección es de una pantalla.
 */
export function HeroCoche({ compraAbierta }: { compraAbierta: boolean }) {
  const seccion = useRef<HTMLElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [listo, setListo] = useState(false);
  const [con3d, setCon3d] = useState(true);
  const [progreso, setProgreso] = useState(0);

  // Preparar el 3D cuando la página ya se ve (la foto es lo primero que se pinta)
  useEffect(() => {
    const canvas = lienzo.current;
    const caja = seccion.current;
    if (!canvas || !caja) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sinWebgl = !document.createElement("canvas").getContext("webgl2");
    if (quieto || sinWebgl) {
      // En el siguiente fotograma (no dentro del propio efecto): la sección pasa a una sola pantalla
      const id = requestAnimationFrame(() => setCon3d(false));
      return () => cancelAnimationFrame(id);
    }

    let escena: EscenaCoche | null = null;
    let cancelado = false;
    let marco = 0;

    const medir = () => {
      marco = 0;
      const r = caja.getBoundingClientRect();
      const recorrido = r.height - window.innerHeight;
      const p = recorrido > 0 ? Math.min(1, Math.max(0, -r.top / recorrido)) : 0;
      setProgreso(p);
      escena?.abrir(aperturaDe(p));
      const i = piezaDe(p);
      escena?.enfocar(i === null ? null : PIEZAS[i].id);
    };
    const alMover = () => {
      if (!marco) marco = requestAnimationFrame(medir);
    };

    const visible = new IntersectionObserver(([e]) => escena?.pausar(!e.isIntersecting));
    const empezar = async () => {
      const { crearEscenaCoche } = await import("./escenaCoche");
      if (cancelado) return;
      escena = await crearEscenaCoche(canvas, { ligero: window.innerWidth < 768 });
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
  }, []);

  const pieza = piezaDe(progreso);
  // El titular se va al empezar a abrirse; al final, montado otra vez, llega la última frase
  const intro = 1 - suave(0.02, 0.1, progreso);
  const final = suave(CIERRA[0] + 0.05, CIERRA[1], progreso);
  /** El mismo sitio para todos los textos: a la izquierda en pantallas anchas, arriba en el móvil */
  const HUECO =
    "absolute inset-x-0 top-[5.5rem] sm:top-28 lg:top-1/2 lg:-translate-y-1/2 mx-auto max-w-6xl px-4 sm:px-6";

  return (
    <section
      ref={seccion}
      aria-labelledby="titulo-portada"
      className={cn("relative bg-estudio", con3d ? "h-[300svh]" : "h-auto")}
    >
      <div className={cn("top-0 h-svh min-h-[36rem] overflow-hidden", con3d && "sticky")}>
        {/* Luz de estudio: fondo de papel cálido con un foco suave donde está el coche */}
        <div aria-hidden="true" className="foco-estudio absolute inset-0" />

        {/* La foto mientras carga el 3D (y si no hay 3D) */}
        <Image
          src="/images/redes/kits/vr1-starter-kit.png"
          alt=""
          width={1000}
          height={750}
          priority
          className={cn(
            "absolute inset-x-0 bottom-[4%] mx-auto w-[min(96vw,44rem)] transition-opacity duration-700 lg:top-1/2 lg:right-[2%] lg:bottom-auto lg:left-auto lg:mx-0 lg:w-[54vw] lg:max-w-[54rem] lg:-translate-y-1/2",
            listo && "opacity-0",
          )}
        />
        <canvas
          ref={lienzo}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-1000",
            listo ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Titular (al principio) */}
        <div className={HUECO} style={{ opacity: intro }} inert={intro < 0.05}>
          <h1
            id="titulo-portada"
            className="llegar titular-cartel max-w-[9ch] text-[3.25rem] font-medium text-tinta sm:text-7xl lg:text-[5.25rem] xl:text-[5.75rem]"
            style={{ "--i": 0 } as React.CSSProperties}
          >
            Construye tu propio robot.
          </h1>
          <p
            className="llegar mt-4 max-w-[22rem] text-lg leading-snug text-tinta/70 sm:mt-6 sm:text-xl"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Sin soldar y sin saber programar. Con un curso en vídeo que te guía.
          </p>
          <div
            className="llegar mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 sm:mt-8"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <Boton href="/kits" variante="primario" tamano="lg">
              Ver los kits
            </Boton>
            {!compraAbierta && (
              <Boton href="#avisame" variante="enlace" tamano="lg" className="text-tinta!">
                Avísame cuando abra
              </Boton>
            )}
          </div>
        </div>

        {/* Una pieza cada vez, en el mismo sitio que el titular */}
        {con3d && (
          <div aria-live="polite" className={cn(HUECO, "pointer-events-none")}>
            {/* Por dónde vas: cinco rayitas */}
            <div
              aria-hidden="true"
              className={cn(
                "mb-6 flex gap-1.5 transition-opacity duration-500",
                pieza === null && "opacity-0",
              )}
            >
              {PIEZAS.map((p, i) => (
                <span
                  key={p.id}
                  className={cn(
                    "h-1 rounded-full transition-[width,background-color] duration-500",
                    pieza === i ? "w-8 bg-tinta" : "w-3 bg-tinta/20",
                  )}
                />
              ))}
            </div>
            <div className="relative">
              {PIEZAS.map((p, i) => (
                <div
                  key={p.id}
                  className={cn(
                    "max-w-xs transition-[opacity,translate] duration-700 ease-out lg:max-w-sm",
                    i > 0 && "absolute inset-x-0 top-0",
                    pieza === i ? "translate-y-0 opacity-100 delay-150" : "translate-y-2 opacity-0",
                  )}
                  aria-hidden={pieza !== i}
                >
                  <p className="font-titulo text-4xl font-medium tracking-tight text-tinta sm:text-5xl lg:text-6xl">
                    {p.titulo}
                  </p>
                  <p className="mt-3 text-lg leading-snug text-tinta/70 sm:text-xl">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Al final, otra vez montado */}
        {con3d && (
          <div
            className={cn(HUECO, "pointer-events-none")}
            style={{ opacity: final }}
            aria-hidden={final < 0.5}
          >
            <p className="max-w-[12ch] font-titulo text-4xl font-medium tracking-tight text-tinta sm:text-5xl lg:text-6xl">
              Y lo montas tú.
            </p>
          </div>
        )}

        {/* Pista para bajar (solo al principio) */}
        {con3d && (
          <div
            aria-hidden="true"
            className="absolute bottom-5 left-1/2 -translate-x-1/2"
            style={{ opacity: intro * (listo ? 1 : 0) }}
          >
            <span className="pista-bajar block h-9 w-px bg-tinta/35" />
          </div>
        )}
      </div>
    </section>
  );
}
