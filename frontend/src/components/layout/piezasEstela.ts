/**
 * PIEZAS QUE APARECEN EN LA ESTELA DEL RATÓN (EstelaCircuito). Jesse, 12-11-2026: «que salgan
 * chips como estos (los de la placa del titular) haciendo variaciones de color, forma y dibujo».
 *  - Al final de cada cable (cuando el ratón se para) sale un chip grande, distinto cada vez:
 *    chip cuadrado con patas en los 4 lados, chip alargado de dos filas de patas, módulo de color
 *    con taladros y un dibujo (sensor de ultrasonidos, pantalla, robot, LED) o un par de engranajes.
 *  - Por el camino, piezas pequeñas: resistencias, condensadores, LED y vías.
 * Todo se dibuja en el lienzo (sin imágenes). `crearChip` y `crearPequena` eligen al azar; `pintarPieza` dibuja.
 */

export type TipoPieza =
  "cuadrado" | "alargado" | "modulo" | "engranajes" | "resistencia" | "condensador" | "led" | "via";

export interface Pieza {
  tipo: TipoPieza;
  /** Centro, en píxeles de la PÁGINA */
  x: number;
  y: number;
  /** 1 → 0: se apaga */
  vida: number;
  /** Fotogramas desde que salió (para el «pop» de entrada) */
  edad: number;
  /** Lo que cambia de una a otra */
  cuerpo: string;
  ancho: number;
  alto: number;
  patas: number;
  texto: string;
  subtexto: string;
  dibujo: "sensor" | "pantalla" | "robot" | "led" | "ninguno";
  vertical: boolean;
  /** Color de las pistas y la serigrafía (verde o cobre, el de la estela) */
  tinta: string;
}

const PLATA = "#c9ccd1";
const COBRE = "#d8a743";
const NOMBRES: [string, string][] = [
  ["VR-01", "ESP32"],
  ["ATMEGA", "328P"],
  ["L298N", "DRIVER"],
  ["RP2040", "DUAL M0+"],
  ["CH340", "USB"],
  ["BMP280", "PRESIÓN"],
  ["DHT22", "HUMEDAD"],
  ["VR-02", "BRAZO"],
];
const CUERPOS_CHIP = ["#141414", "#1c1c2b", "#262626", "#16241c"];
const CUERPOS_MODULO = ["#1f4fbf", "#b3261e", "#5b2a86", "#0c3a24", "#1a1a1a", "#0f6b78"];
const COLORES_LED = ["#ff4d4d", "#40d67b", "#ffc21a", "#4d7dff"];

const azar = <T>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)];
const entre = (a: number, b: number) => a + Math.random() * (b - a);
let contador = 0;

/** Chip grande para el final del cable, cada vez distinto */
export function crearChip(x: number, y: number, tinta: string): Pieza {
  contador++;
  const tipo = azar<TipoPieza>([
    "cuadrado",
    "cuadrado",
    "alargado",
    "modulo",
    "modulo",
    "engranajes",
  ]);
  const [texto, subtexto] = azar(NOMBRES);
  const base = { tipo, x, y, vida: 1, edad: 0, texto, subtexto, tinta, vertical: false };
  if (tipo === "cuadrado") {
    const lado = Math.round(entre(44, 70));
    return {
      ...base,
      cuerpo: azar(CUERPOS_CHIP),
      ancho: lado,
      alto: lado,
      patas: Math.round(entre(3, 6)),
      dibujo: "ninguno",
    };
  }
  if (tipo === "alargado") {
    return {
      ...base,
      cuerpo: azar(CUERPOS_CHIP),
      ancho: Math.round(entre(70, 104)),
      alto: 30,
      patas: Math.round(entre(4, 8)),
      dibujo: "ninguno",
      vertical: Math.random() < 0.4,
    };
  }
  if (tipo === "modulo") {
    return {
      ...base,
      cuerpo: azar(CUERPOS_MODULO),
      ancho: Math.round(entre(84, 112)),
      alto: Math.round(entre(52, 66)),
      patas: Math.round(entre(4, 6)),
      dibujo: azar(["sensor", "pantalla", "robot", "led"] as const),
      vertical: false,
    };
  }
  return { ...base, cuerpo: COBRE, ancho: 60, alto: 40, patas: 0, dibujo: "ninguno" };
}

/** Pieza pequeña para dejar por el camino */
export function crearPequena(x: number, y: number, tinta: string, vertical: boolean): Pieza {
  contador++;
  const tipo = azar<TipoPieza>(["resistencia", "resistencia", "condensador", "led", "via"]);
  const numero = (contador % 9) + 1;
  return {
    tipo,
    x,
    y,
    vida: 1,
    edad: 0,
    cuerpo: tipo === "led" ? azar(COLORES_LED) : tipo === "condensador" ? "#a8794a" : "#151515",
    ancho: 22,
    alto: 10,
    patas: 0,
    texto:
      tipo === "resistencia"
        ? `R${numero}`
        : tipo === "condensador"
          ? `C${numero}`
          : tipo === "led"
            ? `D${numero}`
            : "",
    subtexto: "",
    dibujo: "ninguno",
    vertical,
    tinta,
  };
}

/** Dibuja una pieza en su sitio (dx, dy = scroll de la página) */
export function pintarPieza(
  ctx: CanvasRenderingContext2D,
  p: Pieza,
  dx: number,
  dy: number,
  tiempo: number,
) {
  // Entrada con un pequeño rebote y salida apagándose
  const e = Math.min(1, p.edad / 12);
  const escala = e < 1 ? 0.6 + 0.5 * Math.sin((e * Math.PI) / 1.6) : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, p.vida * 1.4));
  ctx.translate(p.x - dx, p.y - dy);
  ctx.scale(escala, escala);
  if (
    p.vertical &&
    (p.tipo === "alargado" || p.tipo === "resistencia" || p.tipo === "condensador")
  ) {
    ctx.rotate(Math.PI / 2);
  }
  switch (p.tipo) {
    case "cuadrado":
      pintarCuadrado(ctx, p);
      break;
    case "alargado":
      pintarAlargado(ctx, p);
      break;
    case "modulo":
      pintarModulo(ctx, p);
      break;
    case "engranajes":
      engranaje(ctx, -10, 0, 20, 10, tiempo * 1.2);
      engranaje(ctx, 20, 12, 13, 7, -tiempo * 1.2 * (10 / 7) + 0.2);
      break;
    case "resistencia":
    case "condensador":
      pintarPasiva(ctx, p);
      break;
    case "led":
      ctx.shadowColor = p.cuerpo;
      ctx.shadowBlur = 12;
      ctx.fillStyle = p.cuerpo;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      etiqueta(ctx, p.texto, 0, -12, p.tinta);
      break;
    case "via":
      ctx.strokeStyle = COBRE;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

function etiqueta(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  color: string,
  tam = 10,
) {
  if (!texto) return;
  ctx.font = `600 ${tam}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(texto, x, y);
}

/** Fila de patas plateadas a lo largo de un lado */
function patas(
  ctx: CanvasRenderingContext2D,
  n: number,
  largo: number,
  fijo: number,
  horizontal: boolean,
  salida: number,
) {
  ctx.fillStyle = PLATA;
  const paso = largo / (n + 1);
  for (let i = 1; i <= n; i++) {
    const t = -largo / 2 + paso * i;
    if (horizontal) ctx.fillRect(t - 2.5, fijo + (salida < 0 ? salida : 0), 5, Math.abs(salida));
    else ctx.fillRect(fijo + (salida < 0 ? salida : 0), t - 2.5, Math.abs(salida), 5);
  }
}

function pintarCuadrado(ctx: CanvasRenderingContext2D, p: Pieza) {
  const l = p.ancho;
  const m = l / 2;
  // Contorno impreso de puntos y su referencia, como «U1» en la placa
  ctx.strokeStyle = p.tinta;
  ctx.globalAlpha *= 0.8;
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1;
  ctx.strokeRect(-m - 14, -m - 14, l + 28, l + 28);
  ctx.setLineDash([]);
  etiqueta(ctx, `U${(contador % 9) + 1}`, -m - 4, -m - 22, p.tinta);
  ctx.globalAlpha /= 0.8;
  patas(ctx, p.patas, l, -m, true, -8);
  patas(ctx, p.patas, l, m, true, 8);
  patas(ctx, p.patas, l, -m, false, -8);
  patas(ctx, p.patas, l, m, false, 8);
  ctx.fillStyle = p.cuerpo;
  ctx.fillRect(-m, -m, l, l);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.strokeRect(-m + 3, -m + 3, l - 6, l - 6);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(-m + 8, -m + 8, 2.5, 0, Math.PI * 2);
  ctx.fill();
  etiqueta(ctx, p.texto, 0, -4, "rgba(255,255,255,0.75)", l > 56 ? 11 : 9);
  etiqueta(ctx, p.subtexto, 0, 9, "rgba(255,255,255,0.35)", 7);
}

function pintarAlargado(ctx: CanvasRenderingContext2D, p: Pieza) {
  const w = p.ancho;
  const h = p.alto;
  patas(ctx, p.patas, w - 10, -h / 2, true, -8);
  patas(ctx, p.patas, w - 10, h / 2, true, 8);
  ctx.fillStyle = p.cuerpo;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // Muesca del pin 1
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.arc(-w / 2, 0, 5, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  etiqueta(ctx, p.texto, 4, 0, "rgba(255,255,255,0.75)", 9);
}

function pintarModulo(ctx: CanvasRenderingContext2D, p: Pieza) {
  const w = p.ancho;
  const h = p.alto;
  // Fila de pines macho abajo
  patas(ctx, p.patas, w * 0.6, h / 2, true, 7);
  ctx.fillStyle = p.cuerpo;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // Taladros de las esquinas, con su anillo de cobre
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    ctx.strokeStyle = COBRE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx * (w / 2 - 7), sy * (h / 2 - 7), 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (p.dibujo === "sensor") {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = PLATA;
      ctx.beginPath();
      ctx.arc(sx * w * 0.22, -2, h * 0.27, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2b2b";
      ctx.beginPath();
      ctx.arc(sx * w * 0.22, -2, h * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.dibujo === "pantalla") {
    ctx.fillStyle = "#050505";
    ctx.fillRect(-w * 0.32, -h * 0.3, w * 0.64, h * 0.5);
    ctx.fillStyle = "#5ee0ff";
    ctx.fillRect(-w * 0.26, -h * 0.2, w * 0.3, 3);
    ctx.fillRect(-w * 0.26, -h * 0.08, w * 0.46, 3);
    ctx.fillRect(-w * 0.26, h * 0.04, w * 0.2, 3);
  } else if (p.dibujo === "robot") {
    // Cara del robot de píxeles de la placa
    const c = 4;
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(-4 * c, -3 * c, 8 * c, 6 * c);
    ctx.fillRect(-0.5 * c, -4.5 * c, c, 1.5 * c);
    ctx.fillStyle = p.cuerpo;
    ctx.fillRect(-3 * c, -2 * c, 6 * c, 4 * c);
    ctx.fillStyle = "#ffd84d";
    ctx.fillRect(-2.5 * c, -1.5 * c, 1.5 * c, 1.5 * c);
    ctx.fillRect(1 * c, -1.5 * c, 1.5 * c, 1.5 * c);
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(-2 * c, 0.8 * c, 4 * c, 0.7 * c);
  } else if (p.dibujo === "led") {
    const color = azarEstable(p);
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -2, h * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  etiqueta(ctx, p.texto, 0, -h / 2 - 10, p.tinta, 9);
}

/** Color de LED fijo para cada módulo (sale de su nombre, no cambia en cada fotograma) */
function azarEstable(p: Pieza) {
  return COLORES_LED[(p.texto.length + p.ancho) % COLORES_LED.length];
}

function pintarPasiva(ctx: CanvasRenderingContext2D, p: Pieza) {
  ctx.fillStyle = COBRE;
  ctx.fillRect(-13, -5, 6, 10);
  ctx.fillRect(7, -5, 6, 10);
  ctx.fillStyle = p.cuerpo;
  ctx.fillRect(-7, -5, 14, 10);
  if (p.tipo === "resistencia") {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(-4, -1, 8, 2);
  }
  etiqueta(ctx, p.texto, 0, -13, p.tinta, 9);
}

function engranaje(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radio: number,
  dientes: number,
  giro: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(giro);
  ctx.fillStyle = COBRE;
  for (let i = 0; i < dientes; i++) {
    ctx.save();
    ctx.rotate((i / dientes) * Math.PI * 2);
    ctx.fillRect(-radio * 0.16, -radio * 1.18, radio * 0.32, radio * 0.4);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, radio * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0c3a24";
  ctx.beginPath();
  ctx.arc(0, 0, radio * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
