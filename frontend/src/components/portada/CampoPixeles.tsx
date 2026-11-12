"use client";

import { useEffect, useRef } from "react";

/**
 * CAMPO DE PÍXELES: el «dibujo vivo» de los campos de color (portada, cabeceras, login, final).
 * Es una PLACA DE CIRCUITO de ordenador vista de cerca (verde, como las de verdad): un chip negro
 * con patas plateadas, pistas de cobre que salen de él (rectas y a 45°) por las que corren señales,
 * pads y vías dorados, resistencias y condensadores, letras impresas en blanco (U1, R3, C2…), LEDs
 * que parpadean, un robot de píxeles que flota y dos engranajes que giran. Todo nace de una rejilla
 * de puntos que se va apagando hacia el texto, y el borde de abajo se difumina (sin cortes).
 * Al mover el ratón, el cursor deja una pista de circuito que se apaga sola (la «estela»).
 *
 * Es un <canvas> decorativo (aria-hidden): no lleva texto. Se para cuando no se ve y, con
 * «reducir movimiento», se dibuja una vez y se queda quieto.
 *
 *   variante → "cabecera" (cabecera de cada página: placa más pequeña a la derecha),
 *              "portada" (primera pantalla: placa grande con robot y engranajes) o
 *              "final" (sobre negro: dos placas, una a cada lado del texto)
 */

type Variante = "portada" | "final" | "cabecera";

/**
 * Colores de cada variante.
 *   placa  → cabeceras y portada: placa verde con cobre, chips negros y letras blancas
 *   oscuro → bloque final (sobre negro): el azul circuito de siempre
 */
type Paleta = {
  pista: string;
  /** Pads, vías y engranajes */
  pad: string;
  chip: string;
  pata: string;
  punto: string;
  claro: string;
  brillo: string;
  hueco: string;
  /** Letras y dibujos impresos en la placa (la «serigrafía») */
  serigrafia: string;
  robot: string;
  pantallaRobot: string;
  estela: string;
};
const PALETAS: Record<"placa" | "oscuro", Paleta> = {
  placa: {
    pista: "rgba(216, 167, 67, 0.62)",
    pad: "#d8a743",
    chip: "#141816",
    pata: "#c4cad0",
    punto: "140, 220, 170",
    claro: "#ffffff",
    brillo: "#ffe066",
    hueco: "#06200f",
    serigrafia: "rgba(240, 246, 242, 0.82)",
    robot: "rgba(240, 246, 242, 0.92)",
    pantallaRobot: "#0c3a24",
    estela: "#d8a743",
  },
  oscuro: {
    pista: "rgba(122, 140, 255, 0.5)",
    pad: "#2d4bff",
    chip: "#2d4bff",
    pata: "rgba(255, 255, 255, 0.45)",
    punto: "122, 140, 255",
    claro: "#ffffff",
    brillo: "#ffc21a",
    hueco: "#0b0b0b",
    serigrafia: "rgba(255, 255, 255, 0.5)",
    robot: "#2d4bff",
    pantallaRobot: "#ffffff",
    estela: "#2d4bff",
  },
};

/**
 * Robot de píxeles (11 × 11): # cuerpo, s pantalla de la cara, o ojos, m boca, a luz de la antena.
 * Los ojos parpadean y la antena se enciende y se apaga.
 */
const ROBOT = [
  ".....a.....",
  ".....#.....",
  "###########",
  "#sssssssss#",
  "#soosssoos#",
  "#soosssoos#",
  "#sssssssss#",
  "#ssmmmmmss#",
  "#sssssssss#",
  "###########",
  ".##.....##.",
];
/** Tamaño de cada píxel del robot, en celdas */
const PIXEL_ROBOT = 0.55;

/** Dónde va cada chip, en fracciones del ancho y del alto, y su tamaño en celdas */
type Chip = {
  fx: number;
  fy: number;
  lado: number;
  robot?: [number, number];
  engranajes?: [number, number];
};

function chipsDe(variante: Variante, estrecho: boolean): Chip[] {
  if (estrecho) {
    // Móvil: el texto ocupa todo el ancho; la placa va abajo, en la esquina
    return variante === "final"
      ? [{ fx: 0.16, fy: 0.9, lado: 4 }]
      : [{ fx: 0.84, fy: variante === "portada" ? 0.89 : 0.85, lado: 4 }];
  }
  if (variante === "portada") {
    return [{ fx: 0.82, fy: 0.42, lado: 8, robot: [-12, 7], engranajes: [7, -11] }];
  }
  if (variante === "final") {
    return [
      { fx: 0.12, fy: 0.62, lado: 6, robot: [-2, -14] },
      { fx: 0.9, fy: 0.36, lado: 5, engranajes: [-2, 9] },
    ];
  }
  return [{ fx: 0.84, fy: 0.5, lado: 6, engranajes: [-12, -3] }];
}

type Punto = { x: number; y: number };
type Pista = {
  puntos: Punto[];
  largo: number;
  final: "pad" | "led" | "nada";
  fase: number;
  velocidad: number;
};

export function CampoPixeles({
  variante = "portada",
  className,
}: {
  variante?: Variante;
  className?: string;
}) {
  const lienzo = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const color = PALETAS[variante === "final" ? "oscuro" : "placa"];
    /** Las piezas y letras de placa de ordenador solo en la placa verde (no en el bloque final) */
    const esPlaca = variante !== "final";

    // Números «al azar» pero siempre iguales: el dibujo no cambia entre visitas
    let semilla = 7;
    const azar = () => {
      semilla = (semilla * 16807) % 2147483647;
      return (semilla - 1) / 2147483646;
    };

    let ancho = 0;
    let alto = 0;
    let celda = 12;
    let estrecho = false;
    let chips: (Chip & { cx: number; cy: number })[] = [];
    let pistas: Pista[] = [];
    let destellos: { x: number; y: number; fase: number; velocidad: number; claro: boolean }[] = [];
    // Lo que no se mueve (rejilla, pistas, chips) se pinta una vez en un lienzo aparte
    const fondo = document.createElement("canvas");
    const fctx = fondo.getContext("2d")!;

    /** ¿Esta celda cae donde va el texto? Ahí no se dibuja nada */
    function zonaTexto(c: number, f: number, columnas: number, filas: number) {
      if (estrecho)
        return f < filas * (variante === "portada" ? 0.8 : variante === "final" ? 0.8 : 0.72);
      if (variante === "final")
        return Math.abs(c - columnas / 2) < columnas * 0.3 && f < filas * 0.85;
      return c < columnas * 0.62 && f < filas * 0.9;
    }

    /** Huecos del robot y los engranajes (en celdas): las pistas se paran antes de llegar */
    let obstaculos: { x: number; y: number; an: number; al: number }[] = [];
    const ocupado = (c: number, f: number) =>
      obstaculos.some((o) => c >= o.x && c <= o.x + o.an && f >= o.y && f <= o.y + o.al);

    /** Cuánto se ve cada cosa según lo cerca que está de un chip (la placa «nace» del chip) */
    function cercania(c: number, f: number) {
      let mejor = 0;
      for (const chip of chips) {
        const d = Math.hypot(c - chip.cx, f - chip.cy) / (chip.lado * (estrecho ? 3.2 : 4.2));
        mejor = Math.max(mejor, 1 - d);
      }
      return Math.max(0, mejor);
    }

    function preparar() {
      const caja = canvas!.getBoundingClientRect();
      ancho = caja.width;
      alto = caja.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const lz of [canvas!, fondo]) {
        lz.width = Math.round(ancho * dpr);
        lz.height = Math.round(alto * dpr);
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      estrecho = ancho < 640;
      celda = estrecho ? 9 : 12;
      semilla = variante === "final" ? 19 : 7;
      const columnas = Math.ceil(ancho / celda);
      const filas = Math.ceil(alto / celda);

      chips = chipsDe(variante, estrecho).map((chip) => ({
        ...chip,
        cx: Math.round(chip.fx * columnas),
        cy: Math.round(chip.fy * filas),
      }));

      obstaculos = [];
      for (const chip of chips) {
        if (chip.robot) {
          const lado = ROBOT.length * PIXEL_ROBOT;
          obstaculos.push({
            x: chip.cx + chip.robot[0] - 1.5,
            y: chip.cy + chip.robot[1] - 1.5,
            an: lado + 3,
            al: lado + 3,
          });
        }
        if (chip.engranajes) {
          obstaculos.push({
            x: chip.cx + chip.engranajes[0] - 4,
            y: chip.cy + chip.engranajes[1] - 4,
            an: 11,
            al: 9,
          });
        }
      }

      // Pistas: de cada lado del chip sale un «bus» de pistas paralelas (no se cruzan):
      // recto, un tramo a 45° y otra vez recto hasta un pad, un LED o el borde
      pistas = [];
      for (const chip of chips) {
        const medio = chip.lado / 2;
        const lados: [number, number][] = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        for (const [dx, dy] of lados) {
          const giro = azar() < 0.5 ? 1 : -1;
          const recto1 = 1 + Math.floor(azar() * 3);
          const diagonal = 2 + Math.floor(azar() * 4);
          for (let p = -medio + 1; p < medio; p += 2) {
            if (azar() < 0.2) continue;
            // Pata: en el borde del chip, repartidas por el lado
            let x = chip.cx + dx * (medio + 1) + (dy !== 0 ? p : 0);
            let y = chip.cy + dy * (medio + 1) + (dx !== 0 ? p : 0);
            const puntos: Punto[] = [{ x, y }];
            const tramos: [number, number, number][] = [
              [dx, dy, recto1],
              [dx + (dx === 0 ? giro : 0), dy + (dy === 0 ? giro : 0), diagonal],
              [dx, dy, 3 + Math.floor(azar() * 14)],
            ];
            let cortada = false;
            for (const [px, py, n] of tramos) {
              for (let i = 0; i < n && !cortada; i++) {
                const nx = x + px;
                const ny = y + py;
                if (zonaTexto(nx, ny, columnas, filas) || ocupado(nx, ny)) cortada = true;
                else {
                  x = nx;
                  y = ny;
                }
              }
              puntos.push({ x, y });
              if (cortada) break;
            }
            const largo = puntos.reduce(
              (s, q, i) => (i ? s + Math.hypot(q.x - puntos[i - 1].x, q.y - puntos[i - 1].y) : 0),
              0,
            );
            if (largo < 2) continue;
            const fuera = x < -1 || y < -1 || x > columnas + 1 || y > filas + 1;
            const r = azar();
            pistas.push({
              puntos,
              largo,
              final: fuera ? "nada" : r < 0.22 ? "led" : "pad",
              fase: azar() * 10,
              velocidad: 0.25 + azar() * 0.35,
            });
          }
        }
      }

      // Píxeles sueltos que parpadean, solo cerca de la placa
      destellos = [];
      const cuantos = Math.round((columnas * filas) / (estrecho ? 40 : 30));
      for (let i = 0; i < cuantos; i++) {
        const c = Math.floor(azar() * columnas);
        const f = Math.floor(azar() * filas);
        if (zonaTexto(c, f, columnas, filas) || ocupado(c, f) || azar() > cercania(c, f) * 1.6)
          continue;
        destellos.push({
          x: c,
          y: f,
          fase: azar() * 7,
          velocidad: 0.5 + azar() * 1.5,
          claro: azar() < 0.6,
        });
      }

      pintarFondo(columnas, filas);
    }

    /** Rejilla de puntos, pistas, pads y chips: lo quieto, una sola vez por tamaño */
    function pintarFondo(columnas: number, filas: number) {
      fctx.clearRect(0, 0, ancho, alto);

      // Rejilla de puntos (como el papel de una placa de prototipos), más fuerte junto al chip
      for (let f = 0; f < filas; f += 2) {
        for (let c = 0; c < columnas; c += 2) {
          if (zonaTexto(c, f, columnas, filas)) continue;
          const a = 0.06 + cercania(c, f) * 0.3;
          fctx.fillStyle = `rgba(${color.punto}, ${a})`;
          fctx.fillRect(c * celda + celda / 2 - 1, f * celda + celda / 2 - 1, 2, 2);
        }
      }

      // Pistas de cobre
      fctx.strokeStyle = color.pista;
      fctx.lineWidth = estrecho ? 2 : 2.5;
      fctx.lineJoin = "round";
      fctx.lineCap = "round";
      for (const pista of pistas) {
        fctx.beginPath();
        pista.puntos.forEach((q, i) => {
          const px = (q.x + 0.5) * celda;
          const py = (q.y + 0.5) * celda;
          if (i) fctx.lineTo(px, py);
          else fctx.moveTo(px, py);
        });
        fctx.stroke();
        const fin = pista.puntos[pista.puntos.length - 1];
        if (pista.final === "pad") {
          // Pad: anillo con agujero
          fctx.beginPath();
          fctx.arc((fin.x + 0.5) * celda, (fin.y + 0.5) * celda, celda * 0.42, 0, Math.PI * 2);
          fctx.fillStyle = color.pad;
          fctx.fill();
          fctx.beginPath();
          fctx.arc((fin.x + 0.5) * celda, (fin.y + 0.5) * celda, celda * 0.17, 0, Math.PI * 2);
          fctx.fillStyle = color.hueco;
          fctx.fill();
        }
      }

      // Chips: cuerpo, patas, muesca y unas rayas como el texto impreso
      for (const chip of chips) {
        const medio = chip.lado / 2;
        const x0 = (chip.cx - medio) * celda;
        const y0 = (chip.cy - medio) * celda;
        const lado = (chip.lado + 1) * celda;
        fctx.fillStyle = color.pata;
        for (let p = -medio + 1; p < medio; p += 2) {
          const centro = (chip.cx + p + 0.5) * celda;
          const centroY = (chip.cy + p + 0.5) * celda;
          const largoPata = celda * 0.9;
          const grueso = celda * 0.45;
          fctx.fillRect(centro - grueso / 2, y0 - largoPata, grueso, largoPata);
          fctx.fillRect(centro - grueso / 2, y0 + lado, grueso, largoPata);
          fctx.fillRect(x0 - largoPata, centroY - grueso / 2, largoPata, grueso);
          fctx.fillRect(x0 + lado, centroY - grueso / 2, largoPata, grueso);
        }
        fctx.fillStyle = color.chip;
        fctx.fillRect(x0, y0, lado, lado);
        // Borde interior más claro: le da volumen
        fctx.strokeStyle = "rgba(255,255,255,0.25)";
        fctx.lineWidth = 1;
        fctx.strokeRect(x0 + 3.5, y0 + 3.5, lado - 7, lado - 7);
        fctx.beginPath();
        fctx.arc(x0 + celda * 0.9, y0 + celda * 0.9, celda * 0.28, 0, Math.PI * 2);
        fctx.fillStyle = "rgba(255,255,255,0.55)";
        fctx.fill();
        if (esPlaca) {
          // Texto grabado en el chip, contorno impreso alrededor y su nombre (U1, U2…)
          if (chip.lado >= 5) {
            fctx.fillStyle = "rgba(255,255,255,0.5)";
            fctx.font = `600 ${Math.round(celda * 0.85)}px ui-monospace, monospace`;
            fctx.textAlign = "center";
            fctx.textBaseline = "middle";
            fctx.fillText("VR-01", x0 + lado / 2, y0 + lado * 0.5);
            fctx.fillStyle = "rgba(255,255,255,0.3)";
            fctx.font = `${Math.round(celda * 0.6)}px ui-monospace, monospace`;
            fctx.fillText("ESP32", x0 + lado / 2, y0 + lado * 0.7);
          }
          const margen = celda * 1.5;
          fctx.strokeStyle = color.serigrafia;
          fctx.lineWidth = 1;
          fctx.setLineDash([celda * 0.5, celda * 0.35]);
          fctx.strokeRect(x0 - margen, y0 - margen, lado + margen * 2, lado + margen * 2);
          fctx.setLineDash([]);
          serigrafia(`U${chips.indexOf(chip) + 1}`, x0 - margen, y0 - margen - celda * 0.5, "left");
        } else if (chip.lado >= 5) {
          fctx.fillStyle = "rgba(255,255,255,0.35)";
          fctx.fillRect(x0 + lado * 0.3, y0 + lado * 0.55, lado * 0.45, 2);
          fctx.fillRect(x0 + lado * 0.3, y0 + lado * 0.68, lado * 0.3, 2);
        }
      }
      if (esPlaca) pintarPiezas(columnas, filas);
    }

    /** Letras impresas en la placa (nombres de las piezas, como en una placa de verdad) */
    function serigrafia(texto: string, x: number, y: number, alinear: CanvasTextAlign = "center") {
      fctx.fillStyle = color.serigrafia;
      fctx.font = `600 ${Math.max(8, Math.round(celda * 0.62))}px ui-monospace, monospace`;
      fctx.textAlign = alinear;
      fctx.textBaseline = "middle";
      fctx.fillText(texto, x, y);
    }

    /**
     * Piezas pequeñas de placa de ordenador, en los huecos libres junto al chip: resistencias
     * (negras), condensadores (marrones) con sus extremos dorados y su nombre impreso, y vías
     * (agujeritos dorados). Nunca encima de una pista, del chip, del texto o del robot.
     */
    function pintarPiezas(columnas: number, filas: number) {
      const usadas = new Set<string>();
      const marcar = (c: number, f: number) => usadas.add(`${c},${f}`);
      const libre = (c: number, f: number) =>
        c >= 1 &&
        f >= 1 &&
        c < columnas - 1 &&
        f < filas - 1 &&
        !usadas.has(`${c},${f}`) &&
        !zonaTexto(c, f, columnas, filas) &&
        !ocupado(c, f);

      // Lo que ya hay: chips (con su contorno impreso) y pistas
      for (const chip of chips) {
        const r = Math.ceil(chip.lado / 2) + 3;
        for (let f = chip.cy - r; f <= chip.cy + r; f++)
          for (let c = chip.cx - r; c <= chip.cx + r; c++) marcar(c, f);
      }
      for (const pista of pistas) {
        const total = Math.ceil(pista.largo * 2);
        for (let i = 0; i <= total; i++) {
          const q = puntoEn(pista, (i / total) * pista.largo);
          for (let df = -1; df <= 1; df++)
            for (let dc = -1; dc <= 1; dc++) marcar(Math.round(q.x) + dc, Math.round(q.y) + df);
        }
      }

      let resistencias = 0;
      let condensadores = 0;
      const maximo = estrecho ? 3 : 9;
      for (let intento = 0; intento < 160 && resistencias + condensadores < maximo; intento++) {
        const chip = chips[Math.floor(azar() * chips.length)];
        const alcance = chip.lado * (estrecho ? 2.2 : 3);
        const c = Math.round(chip.cx + (azar() * 2 - 1) * alcance);
        const f = Math.round(chip.cy + (azar() * 2 - 1) * alcance);
        const tumbada = azar() < 0.6;
        const esCondensador = azar() < 0.4;
        // La pieza ocupa 3 celdas (y su nombre, una más); se deja una de aire alrededor
        const celdas: [number, number][] = [];
        for (let k = -1; k <= 3; k++)
          for (let l = -2; l <= 1; l++) celdas.push(tumbada ? [c + k, f + l] : [c + l, f + k]);
        if (!celdas.every(([cc, ff]) => libre(cc, ff)) || cercania(c, f) < 0.15) continue;
        celdas.forEach(([cc, ff]) => marcar(cc, ff));

        const largo = celda * 2.4;
        const grueso = celda * 0.95;
        const x = (c + 0.5) * celda + (tumbada ? celda * 1 - largo / 2 : -grueso / 2);
        const y = (f + 0.5) * celda + (tumbada ? -grueso / 2 : celda * 1 - largo / 2);
        const an = tumbada ? largo : grueso;
        const al = tumbada ? grueso : largo;
        const punta = celda * 0.5;
        // Extremos dorados (donde se suelda) y cuerpo
        fctx.fillStyle = color.pad;
        fctx.fillRect(x, y, an, al);
        fctx.fillStyle = esCondensador ? "#a87a4b" : "#121212";
        if (tumbada) fctx.fillRect(x + punta, y, an - punta * 2, al);
        else fctx.fillRect(x, y + punta, an, al - punta * 2);
        if (!esCondensador) {
          // El número de la resistencia, en blanco muy pequeño
          fctx.fillStyle = "rgba(255,255,255,0.55)";
          fctx.fillRect(x + an / 2 - celda * 0.35, y + al / 2 - 0.75, celda * 0.7, 1.5);
        }
        const nombre = esCondensador ? `C${++condensadores}` : `R${++resistencias}`;
        if (tumbada) serigrafia(nombre, x + an / 2, y - celda * 0.7);
        else serigrafia(nombre, x - celda * 0.9, y + al / 2);
      }

      // Vías: agujeritos que llevan la señal al otro lado de la placa
      const vias = Math.round((columnas * filas) / (estrecho ? 160 : 110));
      for (let i = 0; i < vias * 4 && i < 600; i++) {
        const c = Math.floor(azar() * columnas);
        const f = Math.floor(azar() * filas);
        if (!libre(c, f) || azar() > cercania(c, f) * 1.4) continue;
        marcar(c, f);
        fctx.beginPath();
        fctx.arc((c + 0.5) * celda, (f + 0.5) * celda, celda * 0.3, 0, Math.PI * 2);
        fctx.fillStyle = color.pad;
        fctx.fill();
        fctx.beginPath();
        fctx.arc((c + 0.5) * celda, (f + 0.5) * celda, celda * 0.12, 0, Math.PI * 2);
        fctx.fillStyle = color.hueco;
        fctx.fill();
      }

      // Nombre y versión de la placa, impresos debajo del chip principal (como en las de verdad)
      const principal = chips[0];
      if (principal && !estrecho) {
        const f = principal.cy + Math.ceil(principal.lado / 2) + 5;
        const c = principal.cx;
        if (!zonaTexto(c - 6, f, columnas, filas) && f < filas - 2) {
          const texto = "VALENTIA ROBOTICS · REV 2.6";
          fctx.font = `600 ${Math.max(8, Math.round(celda * 0.62))}px ui-monospace, monospace`;
          // Que no se corte en el borde derecho
          const mitad = fctx.measureText(texto).width / 2;
          serigrafia(texto, Math.min((c + 0.5) * celda, ancho - celda - mitad), (f + 0.5) * celda);
        }
      }
    }

    /** Un punto a cierta distancia a lo largo de una pista */
    function puntoEn(pista: Pista, d: number): Punto {
      let resto = d;
      for (let i = 1; i < pista.puntos.length; i++) {
        const a = pista.puntos[i - 1];
        const b = pista.puntos[i];
        const tramo = Math.hypot(b.x - a.x, b.y - a.y);
        if (resto <= tramo) {
          const k = tramo ? resto / tramo : 0;
          return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
        }
        resto -= tramo;
      }
      return pista.puntos[pista.puntos.length - 1];
    }

    function pintarEngranaje(x: number, y: number, radio: number, dientes: number, angulo: number) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(angulo);
      ctx!.beginPath();
      for (let i = 0; i < dientes * 2; i++) {
        const a0 = (i / (dientes * 2)) * Math.PI * 2;
        const a1 = ((i + 1) / (dientes * 2)) * Math.PI * 2;
        const r = i % 2 === 0 ? radio : radio * 0.78;
        ctx!.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
        ctx!.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      }
      ctx!.closePath();
      ctx!.fillStyle = color.pad;
      ctx!.fill();
      ctx!.beginPath();
      ctx!.arc(0, 0, radio * 0.32, 0, Math.PI * 2);
      ctx!.fillStyle = color.hueco;
      ctx!.fill();
      ctx!.restore();
    }

    // La estela del ratón: una pista de circuito que se va apagando
    const estela: { x: number; y: number; vida: number }[] = [];

    function pintar(tiempo: number) {
      const t = quieto ? 0 : tiempo / 1000;
      // Sin tamaño todavía (la página aún se está colocando, o el bloque está oculto): copiar un
      // lienzo de 0 px da error en el navegador. Se pinta en cuanto tenga tamaño (ResizeObserver).
      if (!fondo.width || !fondo.height || !ancho || !alto) return;
      ctx!.clearRect(0, 0, ancho, alto);
      ctx!.drawImage(fondo, 0, 0, ancho, alto);
      const c2 = celda / 2;

      // Señales que corren por las pistas, del chip hacia fuera, con una cola que se apaga
      for (const pista of pistas) {
        const ciclo = pista.largo / (pista.velocidad * 6) + 1.5;
        const progreso = ((t + pista.fase) % ciclo) / (ciclo - 1.5);
        if (!quieto && progreso <= 1) {
          for (let k = 0; k < 5; k++) {
            const d = progreso * pista.largo - k * 0.35;
            if (d < 0) break;
            const q = puntoEn(pista, d);
            ctx!.globalAlpha = (1 - k / 5) * 0.95;
            ctx!.fillStyle = k === 0 ? color.brillo : color.claro;
            const s = k === 0 ? celda * 0.42 : celda * 0.3;
            ctx!.fillRect((q.x + 0.5) * celda - s / 2, (q.y + 0.5) * celda - s / 2, s, s);
          }
        }
        // LED al final: se enciende al llegar la señal y se apaga despacio
        if (pista.final === "led") {
          const fin = pista.puntos[pista.puntos.length - 1];
          const luz = quieto ? 0.8 : Math.max(0.25, 1 - Math.max(0, progreso - 1) * 1.2);
          const px = fin.x * celda;
          const py = fin.y * celda;
          ctx!.globalAlpha = luz * 0.3;
          ctx!.fillStyle = color.brillo;
          ctx!.beginPath();
          ctx!.arc(px + c2, py + c2, celda * 1.1, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.globalAlpha = 0.4 + luz * 0.6;
          ctx!.fillRect(px + 1, py + 1, celda - 2, celda - 2);
        }
      }
      ctx!.globalAlpha = 1;

      // Píxeles sueltos que parpadean
      for (const p of destellos) {
        const brillo = quieto ? 0.6 : 0.45 + 0.55 * Math.sin(t * p.velocidad + p.fase);
        if (brillo < 0.1) continue;
        ctx!.globalAlpha = brillo;
        ctx!.fillStyle = p.claro ? color.claro : color.brillo;
        ctx!.fillRect(p.x * celda + 3, p.y * celda + 3, celda - 6, celda - 6);
      }
      ctx!.globalAlpha = 1;

      for (const chip of chips) {
        // El robot flota un poco; parpadea cada pocos segundos
        if (chip.robot) {
          const lado = celda * PIXEL_ROBOT;
          const rx = (chip.cx + chip.robot[0]) * celda;
          const ry = (chip.cy + chip.robot[1]) * celda + (quieto ? 0 : Math.sin(t * 1.6) * 3);
          const parpadeo = !quieto && t % 4 < 0.15;
          const antena = quieto || Math.sin(t * 3) > 0;
          const colores: Record<string, string> = {
            "#": color.robot,
            s: color.pantallaRobot,
            o: parpadeo ? color.pantallaRobot : esPlaca ? color.brillo : color.robot,
            m: color.robot,
            a: antena ? color.brillo : color.robot,
          };
          ROBOT.forEach((fila, f) => {
            for (let c = 0; c < fila.length; c++) {
              const pintura = colores[fila[c]];
              if (!pintura) continue;
              ctx!.fillStyle = pintura;
              ctx!.fillRect(rx + c * lado, ry + f * lado, lado + 0.5, lado + 0.5);
            }
          });
        }
        // Dos engranajes que encajan y giran en sentidos contrarios
        if (chip.engranajes) {
          const gx = (chip.cx + chip.engranajes[0]) * celda;
          const gy = (chip.cy + chip.engranajes[1]) * celda;
          const r1 = celda * 2.4;
          const r2 = celda * 1.6;
          pintarEngranaje(gx, gy, r1, 10, t * 0.5);
          pintarEngranaje(gx + r1 + r2 * 0.82, gy + r2 * 0.6, r2, 7, -t * 0.5 * (10 / 7) + 0.2);
        }
      }

      // La estela del ratón
      if (estela.length > 1) {
        ctx!.lineCap = "round";
        ctx!.lineJoin = "round";
        ctx!.lineWidth = estrecho ? 2 : 3;
        for (let i = 1; i < estela.length; i++) {
          const a = estela[i - 1];
          const b = estela[i];
          ctx!.globalAlpha = Math.max(0, Math.min(a.vida, b.vida)) * 0.85;
          ctx!.strokeStyle = color.estela;
          ctx!.beginPath();
          ctx!.moveTo(a.x * celda + c2, a.y * celda + c2);
          ctx!.lineTo(b.x * celda + c2, b.y * celda + c2);
          ctx!.stroke();
        }
        const cabeza = estela[estela.length - 1];
        ctx!.globalAlpha = Math.max(0, cabeza.vida);
        ctx!.fillStyle = color.brillo;
        ctx!.fillRect(cabeza.x * celda + 2, cabeza.y * celda + 2, celda - 4, celda - 4);
      }
      for (const p of estela) p.vida -= 0.018;
      while (estela.length && estela[0].vida <= 0) estela.shift();
      ctx!.globalAlpha = 1;
    }

    preparar();
    let fotograma = 0;
    let visible = true;
    const bucle = (tiempo: number) => {
      pintar(tiempo);
      fotograma = visible && !quieto ? requestAnimationFrame(bucle) : 0;
    };
    const arrancar = () => {
      if (!fotograma && visible && !quieto) fotograma = requestAnimationFrame(bucle);
    };
    pintar(0);
    arrancar();

    const observador = new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting;
      if (visible) arrancar();
    });
    observador.observe(canvas);

    const redimensionar = new ResizeObserver(() => {
      preparar();
      pintar(performance.now());
    });
    redimensionar.observe(canvas);

    // El ratón se escucha en la sección entera (el lienzo no recibe clics: el texto sigue usable).
    // Cada paso se une al anterior solo en recto o a 45°, como una pista de verdad.
    const zona = canvas.parentElement;
    const alMover = (e: PointerEvent) => {
      if (quieto || e.pointerType !== "mouse") return;
      const caja = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - caja.left) / celda);
      const y = Math.floor((e.clientY - caja.top) / celda);
      const ultimo = estela[estela.length - 1];
      if (ultimo && ultimo.x === x && ultimo.y === y) return;
      if (ultimo) {
        const dx = x - ultimo.x;
        const dy = y - ultimo.y;
        const diagonal = Math.min(Math.abs(dx), Math.abs(dy));
        if (diagonal && Math.abs(dx) !== Math.abs(dy)) {
          // Esquina: primero el tramo a 45°, luego el recto
          estela.push({
            x: ultimo.x + Math.sign(dx) * diagonal,
            y: ultimo.y + Math.sign(dy) * diagonal,
            vida: 1,
          });
        }
      }
      estela.push({ x, y, vida: 1 });
      if (estela.length > 80) estela.splice(0, estela.length - 80);
      arrancar();
    };
    zona?.addEventListener("pointermove", alMover);

    return () => {
      cancelAnimationFrame(fotograma);
      observador.disconnect();
      redimensionar.disconnect();
      zona?.removeEventListener("pointermove", alMover);
    };
  }, [variante]);

  return (
    <canvas
      ref={lienzo}
      aria-hidden="true"
      className={
        className ??
        // El dibujo se difumina por abajo (y por arriba en el bloque final, que viene de un fundido)
        "pointer-events-none absolute inset-0 size-full " +
          (variante === "final" ? "mascara-arriba" : "mascara-abajo")
      }
    />
  );
}
