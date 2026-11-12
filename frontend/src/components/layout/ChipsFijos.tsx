"use client";

import { useEffect, useRef, useState } from "react";
import { pintarPieza, type Pieza, type TipoPieza } from "./piezasEstela";

/**
 * CHIPS FIJOS EN LOS MÁRGENES DE LA WEB (Jesse, 12-11-2026: «algunos chips fijos que se ven siempre»).
 * En pantallas anchas, a los lados del contenido, cada ~900 px de página hay un chip montado con un
 * par de piezas pequeñas y una pista que va hacia el contenido, con animación suave (señal por la
 * pista, LED que respiran, engranajes) y fundidos con el fondo. Mismas funciones de dibujo que los
 * de la estela (piezasEstela.ts).
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

/** Recorrido de la pista: del chip hacia el contenido, a 45° y hasta un pad; luego se apaga en el fondo */
function pistaDe(cx: number, cy: number, hacia: number): [number, number][] {
  return [
    [cx, cy],
    [cx + hacia * 40, cy],
    [cx + hacia * 52, cy + 12],
    [cx + hacia * 70, cy + 12],
  ];
}

/** Punto a una distancia dada recorriendo una poli-línea */
function puntoEn(pista: [number, number][], dist: number): [number, number] {
  let resto = dist;
  for (let i = 1; i < pista.length; i++) {
    const [x0, y0] = pista[i - 1];
    const [x1, y1] = pista[i];
    const largo = Math.hypot(x1 - x0, y1 - y0);
    if (resto <= largo) return [x0 + ((x1 - x0) * resto) / largo, y0 + ((y1 - y0) * resto) / largo];
    resto -= largo;
  }
  return pista[pista.length - 1];
}

/**
 * Un chip montado y VIVO: la pista con una señal que corre hacia el contenido, LED que respiran,
 * engranajes que giran y ondas en el zumbador. Solo se anima mientras se ve (IntersectionObserver),
 * a ~30 fotogramas por segundo, y con «reducir movimiento» se queda quieto.
 * Va suave para no parecer un pegote: baja opacidad, un pelo de desenfoque y máscara que lo funde
 * con el fondo (ver el estilo de abajo).
 */
function ChipMontado({ montaje, lado }: { montaje: Montaje; lado: "izquierda" | "derecha" }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ppp = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = ANCHO * ppp;
    canvas.height = ALTO * ppp;
    const cx = ANCHO / 2;
    const cy = 60;
    const hacia = lado === "izquierda" ? 1 : -1;
    const pista = pistaDe(cx, cy, hacia);
    const largoPista = pista
      .slice(1)
      .reduce((s, q, i) => s + Math.hypot(q[0] - pista[i][0], q[1] - pista[i][1]), 0);
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const piezaChip = pieza(montaje.chip, cx, cy);
    const piezasPequenas = montaje.pequenas.map((p) =>
      pieza({ ...p, ancho: 22, alto: 10, vertical: p.vertical ?? false }, cx + p.dx, cy + p.dy),
    );

    function pintar(t: number) {
      ctx!.setTransform(ppp, 0, 0, ppp, 0, 0);
      ctx!.clearRect(0, 0, ANCHO, ALTO);
      // Pista
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.strokeStyle = COBRE;
      ctx!.globalAlpha = 0.55;
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      pista.forEach(([x, y], i) => (i ? ctx!.lineTo(x, y) : ctx!.moveTo(x, y)));
      ctx!.stroke();
      const [px, py] = pista[pista.length - 1];
      ctx!.globalAlpha = 1;
      ctx!.fillStyle = COBRE;
      ctx!.beginPath();
      ctx!.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx!.fill();
      // Señal que corre por la pista (con cola que se apaga), cada ~3 s
      const fase = (t % 3) / 1.6;
      if (fase < 1) {
        for (let k = 0; k < 6; k++) {
          const d = Math.max(0, fase * largoPista - k * 4);
          const [sx, sy] = puntoEn(pista, d);
          ctx!.globalAlpha = (1 - k / 6) * (1 - fase * 0.4);
          ctx!.fillStyle = "#ffe08a";
          ctx!.fillRect(sx - 2, sy - 2, 4, 4);
        }
        ctx!.globalAlpha = 1;
      }
      // El pad del final late
      ctx!.globalAlpha = 0.25 + 0.25 * Math.sin(t * 2.2);
      ctx!.strokeStyle = COBRE;
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      ctx!.arc(px, py, 7 + 2 * Math.sin(t * 2.2), 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.globalAlpha = 1;

      pintarPieza(ctx!, piezaChip, 0, 0, t);
      for (const p of piezasPequenas) pintarPieza(ctx!, p, 0, 0, t);

      // Luces que respiran: LED sueltos y el del módulo «LED RGB»
      const luces: [number, number, string][] = [];
      for (const p of piezasPequenas) if (p.tipo === "led") luces.push([p.x, p.y, p.cuerpo]);
      if (piezaChip.dibujo === "led") luces.push([cx, cy - 1.6, "#40d67b"]);
      luces.forEach(([lx, ly, color], i) => {
        const r = 10 + 4 * Math.sin(t * 2.4 + i);
        const g = ctx!.createRadialGradient(lx, ly, 0, lx, ly, r);
        g.addColorStop(0, color);
        g.addColorStop(1, "transparent");
        ctx!.globalAlpha = 0.35 + 0.25 * Math.sin(t * 2.4 + i);
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(lx, ly, r, 0, Math.PI * 2);
        ctx!.fill();
      });
      // Ondas del zumbador
      if (piezaChip.tipo === "zumbador") {
        for (let k = 0; k < 2; k++) {
          const f = (t * 0.7 + k * 0.5) % 1;
          ctx!.globalAlpha = (1 - f) * 0.45;
          ctx!.strokeStyle = COBRE;
          ctx!.lineWidth = 1.2;
          ctx!.beginPath();
          ctx!.arc(cx, cy, 20 + f * 22, 0, Math.PI * 2);
          ctx!.stroke();
        }
      }
      ctx!.globalAlpha = 1;
    }

    if (quieto || !visible) {
      pintar(quieto ? 0.4 : 0);
      if (quieto) return;
    }
    if (!visible) return;
    let fotograma = 0;
    let ultimo = 0;
    const bucle = (ahora: number) => {
      // ~30 fotogramas por segundo: sobra para una animación suave y gasta poco
      if (ahora - ultimo > 33) {
        ultimo = ahora;
        pintar(ahora / 1000);
      }
      fotograma = requestAnimationFrame(bucle);
    };
    fotograma = requestAnimationFrame(bucle);
    return () => cancelAnimationFrame(fotograma);
  }, [montaje, lado, visible]);

  // Solo se anima mientras está en pantalla, y entra con un fundido suave
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const observador = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: "120px",
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={caja}
      className="transition-opacity duration-1000 motion-reduce:transition-none"
      style={{
        opacity: visible ? 0.62 : 0,
        // Un pelo de desenfoque y bordes que se funden: que parezca parte del fondo, no una pegatina
        filter: "blur(0.35px) saturate(0.85)",
        maskImage: "radial-gradient(ellipse 52% 48% at 50% 38%, #000 58%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 52% 48% at 50% 38%, #000 58%, transparent 100%)",
      }}
    >
      <canvas ref={lienzo} style={{ width: ANCHO, height: ALTO }} />
    </div>
  );
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
