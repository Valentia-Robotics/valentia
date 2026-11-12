"use client";

import { useEffect, useRef, useState } from "react";
import { pintarPieza, type Pieza, type TipoPieza } from "./piezasEstela";

/**
 * CHIPS FIJOS EN LOS MÁRGENES DE LA WEB (Jesse, 12-11-2026: «algunos chips fijos que se ven siempre»).
 * En pantallas anchas, a los lados del contenido, cada ~900 px de página hay un chip montado con un
 * par de piezas pequeñas y una pista que va hacia el contenido. Se dibujan una vez (sin animación)
 * con las mismas funciones que los de la estela (piezasEstela.ts).
 *  - No salen en el titular (empiezan a 1000 px) ni en el final de la web (paran 900 px antes del
 *    final del contenido): el bloque del final se queda como estaba.
 *  - Solo en pantallas de 1360 px o más (en las estrechas no hay margen y taparían el texto).
 */
const COBRE = "#d8a743";

interface Montaje {
  chip: Partial<Pieza> & { tipo: TipoPieza };
  pequenas: {
    tipo: TipoPieza;
    dx: number;
    dy: number;
    cuerpo: string;
    texto: string;
    vertical?: boolean;
  }[];
}

/** Siempre los mismos y en el mismo orden (no cambian al recargar) */
const MONTAJES: Montaje[] = [
  {
    chip: {
      tipo: "cuadrado",
      cuerpo: "#141414",
      ancho: 56,
      alto: 56,
      patas: 5,
      texto: "VR-01",
      subtexto: "ESP32",
    },
    pequenas: [
      { tipo: "resistencia", dx: -30, dy: 58, cuerpo: "#151515", texto: "R1" },
      { tipo: "electrolitico", dx: 28, dy: 60, cuerpo: "#1f3f8f", texto: "C1" },
    ],
  },
  {
    chip: {
      tipo: "modulo",
      cuerpo: "#1f4fbf",
      ancho: 96,
      alto: 56,
      patas: 5,
      texto: "HC-SR04",
      dibujo: "sensor",
    },
    pequenas: [{ tipo: "diodo", dx: 0, dy: 62, cuerpo: "#151515", texto: "D1" }],
  },
  {
    chip: {
      tipo: "alargado",
      cuerpo: "#1c1c2b",
      ancho: 88,
      alto: 30,
      patas: 7,
      texto: "ATMEGA328P",
    },
    pequenas: [
      { tipo: "cristal", dx: -22, dy: 44, cuerpo: "#c9ccd1", texto: "Y1" },
      { tipo: "ceramico", dx: 26, dy: 46, cuerpo: "#d9822b", texto: "C2" },
    ],
  },
  {
    chip: {
      tipo: "modulo",
      cuerpo: "#b3261e",
      ancho: 90,
      alto: 58,
      patas: 4,
      texto: "VR-02",
      dibujo: "robot",
    },
    pequenas: [{ tipo: "led", dx: -28, dy: 60, cuerpo: "#40d67b", texto: "D2" }],
  },
  {
    chip: { tipo: "zumbador", cuerpo: "#111111", ancho: 44, alto: 44, texto: "BZ1" },
    pequenas: [
      { tipo: "transistor", dx: -26, dy: 50, cuerpo: "#151515", texto: "Q1" },
      { tipo: "resistenciaBandas", dx: 22, dy: 52, cuerpo: "#e2c99a", texto: "R4" },
    ],
  },
  {
    chip: {
      tipo: "modulo",
      cuerpo: "#5b2a86",
      ancho: 92,
      alto: 56,
      patas: 6,
      texto: "OLED",
      dibujo: "pantalla",
    },
    pequenas: [{ tipo: "boton", dx: 0, dy: 60, cuerpo: "#2a2a2a", texto: "SW1" }],
  },
  {
    chip: {
      tipo: "cuadrado",
      cuerpo: "#1c1c2b",
      ancho: 50,
      alto: 50,
      patas: 4,
      texto: "RP2040",
      subtexto: "DUAL M0+",
    },
    pequenas: [
      { tipo: "bobina", dx: -26, dy: 56, cuerpo: "#3a3a3a", texto: "L1" },
      { tipo: "condensador", dx: 24, dy: 56, cuerpo: "#a8794a", texto: "C5" },
    ],
  },
  {
    chip: {
      tipo: "modulo",
      cuerpo: "#0f6b78",
      ancho: 84,
      alto: 54,
      patas: 4,
      texto: "LED RGB",
      dibujo: "led",
    },
    pequenas: [{ tipo: "resistencia", dx: 0, dy: 56, cuerpo: "#151515", texto: "R7" }],
  },
];

const ANCHO = 150;
const ALTO = 170;

function pieza(base: Partial<Pieza> & { tipo: TipoPieza }, x: number, y: number): Pieza {
  return {
    x,
    y,
    vida: 1,
    edad: 12,
    cuerpo: "#141414",
    ancho: 22,
    alto: 10,
    patas: 0,
    texto: "",
    subtexto: "",
    dibujo: "ninguno",
    vertical: false,
    tinta: COBRE,
    tamano: 0.8,
    ...base,
  };
}

/** Un chip montado: pista hacia el contenido, el chip y sus piezas pequeñas */
function ChipMontado({ montaje, lado }: { montaje: Montaje; lado: "izquierda" | "derecha" }) {
  const lienzo = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ppp = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = ANCHO * ppp;
    canvas.height = ALTO * ppp;
    ctx.setTransform(ppp, 0, 0, ppp, 0, 0);
    const cx = ANCHO / 2;
    const cy = 60;
    // Pista hacia el contenido: sale del chip, baja a 45° y acaba en un pad
    const hacia = lado === "izquierda" ? 1 : -1;
    ctx.strokeStyle = COBRE;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + hacia * 40, cy);
    ctx.lineTo(cx + hacia * 52, cy + 12);
    ctx.lineTo(cx + hacia * 70, cy + 12);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = COBRE;
    ctx.beginPath();
    ctx.arc(cx + hacia * 70, cy + 12, 3.5, 0, Math.PI * 2);
    ctx.fill();
    pintarPieza(ctx, pieza(montaje.chip, cx, cy), 0, 0, 0.4);
    for (const p of montaje.pequenas) {
      pintarPieza(
        ctx,
        pieza({ ...p, ancho: 22, alto: 10, vertical: p.vertical ?? false }, cx + p.dx, cy + p.dy),
        0,
        0,
        0,
      );
    }
  }, [montaje, lado]);

  return <canvas ref={lienzo} style={{ width: ANCHO, height: ALTO }} />;
}

export function ChipsFijos() {
  const capa = useRef<HTMLDivElement>(null);
  const [alturas, setAlturas] = useState<number[]>([]);

  useEffect(() => {
    const el = capa.current;
    if (!el) return;
    const medir = () => {
      const alto = el.offsetHeight;
      const lista: number[] = [];
      for (let y = 1000; y < alto - 900 && lista.length < MONTAJES.length; y += 900) lista.push(y);
      setAlturas((antes) => (antes.join() === lista.join() ? antes : lista));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={capa}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 hidden overflow-hidden min-[1360px]:block print:hidden"
    >
      {alturas.map((y, i) => {
        const lado = i % 2 === 0 ? "izquierda" : "derecha";
        return (
          <div
            key={i}
            className="absolute"
            style={{
              top: y,
              // En medio del margen entre el borde de la ventana y el contenido (72rem de ancho)
              [lado === "izquierda" ? "left" : "right"]:
                `calc((100% - 72rem) / 4 - ${ANCHO / 2}px)`,
            }}
          >
            <ChipMontado montaje={MONTAJES[i]} lado={lado} />
          </div>
        );
      })}
    </div>
  );
}
