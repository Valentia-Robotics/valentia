/**
 * Texturas de las fotos de las piezas (serigrafías, rejillas, pantallas…), dibujadas con <canvas>.
 * Solo las usa el estudio de fotos (scripts/fotos-piezas): no se cargan en la web.
 */
import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from "three";

type Dibujo = (ctx: CanvasRenderingContext2D, ancho: number, alto: number) => void;

export function textura(ancho: number, alto: number, dibujar: Dibujo) {
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  dibujar(lienzo.getContext("2d")!, ancho, alto);
  const t = new CanvasTexture(lienzo);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function texto(
  ctx: CanvasRenderingContext2D,
  cadena: string,
  x: number,
  y: number,
  tamano: number,
  peso = 600,
  alinear: CanvasTextAlign = "left",
) {
  ctx.font = `${peso} ${tamano}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = alinear;
  ctx.textBaseline = "middle";
  ctx.fillText(cadena, x, y);
}

/** Pistas de cobre bajo la máscara (líneas algo más claras que la placa) */
function pistas(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, semilla = 7) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, w / 260);
  ctx.lineCap = "round";
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 30; i++) {
    let x = azar() * w;
    let y = azar() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      if (azar() > 0.5) x += (azar() - 0.5) * w * 0.5;
      else y += (azar() - 0.5) * h * 0.5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** Agujeros metalizados (pads) de una fila de pines */
function pads(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  n: number,
  paso: number,
  r: number,
  vertical = false,
) {
  for (let i = 0; i < n; i++) {
    const px = vertical ? x : x + i * paso;
    const py = vertical ? y + i * paso : y;
    ctx.fillStyle = "#d9b45a";
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2c10";
    ctx.beginPath();
    ctx.arc(px, py, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Placa pequeña genérica (módulo de sensor) con su serigrafía */
export function texturaModulo(opciones: {
  ancho: number;
  alto: number;
  color: string;
  pistasColor: string;
  rotulos: {
    texto: string;
    x: number;
    y: number;
    tamano: number;
    peso?: number;
    alinear?: CanvasTextAlign;
  }[];
  pads?: { x: number; y: number; n: number; paso: number; r: number; vertical?: boolean }[];
  semilla?: number;
}) {
  return textura(opciones.ancho, opciones.alto, (ctx, w, h) => {
    ctx.fillStyle = opciones.color;
    ctx.fillRect(0, 0, w, h);
    pistas(ctx, w, h, opciones.pistasColor, opciones.semilla);
    for (const p of opciones.pads ?? []) pads(ctx, p.x, p.y, p.n, p.paso, p.r, p.vertical);
    ctx.fillStyle = "#f3f5f7";
    for (const r of opciones.rotulos)
      texto(ctx, r.texto, r.x, r.y, r.tamano, r.peso ?? 600, r.alinear ?? "center");
  });
}

/** ESP32 DevKit: placa negra con los nombres de los pines en los bordes */
export const texturaEsp32 = () =>
  textura(1100, 560, (ctx, w, h) => {
    ctx.fillStyle = "#16181b";
    ctx.fillRect(0, 0, w, h);
    pistas(ctx, w, h, "rgba(120,130,140,0.18)", 11);
    pads(ctx, 70, 36, 15, 50.8, 15);
    pads(ctx, 70, h - 36, 15, 50.8, 15);
    ctx.fillStyle = "#e9ecef";
    const arriba = [
      "3V3",
      "GND",
      "15",
      "2",
      "4",
      "16",
      "17",
      "5",
      "18",
      "19",
      "GND",
      "21",
      "RX",
      "TX",
      "22",
    ];
    const abajo = [
      "VIN",
      "GND",
      "13",
      "12",
      "14",
      "27",
      "26",
      "25",
      "33",
      "32",
      "35",
      "34",
      "VN",
      "VP",
      "EN",
    ];
    arriba.forEach((t, i) => texto(ctx, t, 70 + i * 50.8, 78, 17, 600, "center"));
    abajo.forEach((t, i) => texto(ctx, t, 70 + i * 50.8, h - 78, 17, 600, "center"));
    texto(ctx, "ESP32 DEVKIT V1", 240, h / 2 + 70, 26, 700, "center");
    texto(ctx, "EN", 60, h / 2 - 75, 20, 700, "center");
    texto(ctx, "BOOT", 60, h / 2 + 75, 20, 700, "center");
  });

/** Blindaje metálico del módulo wifi, con el texto grabado */
export const texturaBlindaje = () =>
  textura(512, 460, (ctx, w, h) => {
    const d = ctx.createLinearGradient(0, 0, w, h);
    d.addColorStop(0, "#d7dade");
    d.addColorStop(0.5, "#c3c7cc");
    d.addColorStop(1, "#d2d5d9");
    ctx.fillStyle = d;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(60,64,70,0.75)";
    texto(ctx, "ESP32-WROOM-32", w / 2, h * 0.3, 44, 700, "center");
    texto(ctx, "WiFi + BT", w / 2, h * 0.47, 34, 600, "center");
    texto(ctx, "2.4 GHz  ·  240 MHz", w / 2, h * 0.62, 28, 500, "center");
    ctx.strokeStyle = "rgba(60,64,70,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, w - 28, h - 28);
  });

/** Antena impresa del módulo (zigzag dorado sobre negro) */
export const texturaAntena = () =>
  textura(512, 200, (ctx, w, h) => {
    ctx.fillStyle = "#121315";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#c9a650";
    ctx.lineWidth = 9;
    ctx.beginPath();
    let x = 40;
    ctx.moveTo(x, h - 20);
    ctx.lineTo(x, 30);
    for (let i = 0; i < 7; i++) {
      ctx.lineTo(x + 30, 30);
      ctx.lineTo(x + 30, i % 2 ? 30 : h - 50);
      x += 30;
      ctx.lineTo(x + 30, i % 2 ? h - 50 : h - 50);
      x += 30;
      ctx.lineTo(x, 30);
    }
    ctx.stroke();
  });

/** Rejilla de ventilación del DHT22 (carcasa blanca con ranuras) */
export const texturaDht22 = () =>
  textura(300, 500, (ctx, w, h) => {
    ctx.fillStyle = "#f2f2ee";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#c8c9c4";
    ctx.fillRect(0, 0, w, 6);
    for (let fila = 0; fila < 9; fila++)
      for (let col = 0; col < 4; col++) {
        const x = 32 + col * 62;
        const y = 34 + fila * 44;
        ctx.fillStyle = "#2a2b2d";
        ctx.beginPath();
        ctx.roundRect(x, y, 50, 30, 5);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x + 4, y + 18, 42, 8);
      }
    ctx.fillStyle = "#8d8e89";
    texto(ctx, "DHT22", w / 2, h - 48, 34, 700, "center");
  });

/** Pegatina lateral de un servo */
export const texturaPegatinaServo = (modelo: string, detalle: string, fondo: string) =>
  textura(600, 300, (ctx, w, h) => {
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#f5f5f5";
    texto(ctx, modelo, w / 2, h * 0.38, 92, 800, "center");
    texto(ctx, detalle, w / 2, h * 0.72, 38, 600, "center");
  });

/** Fotorresistencia vista desde arriba: cerámica blanca con la pista roja en zigzag */
export const texturaLdr = () =>
  textura(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#e9e4d8";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#b8452c";
    ctx.lineWidth = 12;
    ctx.beginPath();
    let y = 50;
    ctx.moveTo(40, y);
    for (let i = 0; i < 6; i++) {
      const x = i % 2 ? 40 : w - 40;
      ctx.lineTo(x, y);
      y += 31;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#cfc8b6";
    ctx.fillRect(0, 0, w, 26);
    ctx.fillRect(0, h - 26, w, 26);
  });

/** Pantalla OLED encendida: una cara simpática (ojos) y un dato */
export const texturaOled = () =>
  textura(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#dff4ff";
    for (const x of [150, 362]) {
      ctx.beginPath();
      ctx.roundRect(x - 52, 52, 104, 110, 34);
      ctx.fill();
    }
    ctx.fillStyle = "#000";
    for (const x of [150, 362]) {
      ctx.beginPath();
      ctx.arc(x + 18, 92, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#dff4ff";
    ctx.beginPath();
    ctx.arc(w / 2, 168, 40, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#dff4ff";
    ctx.stroke();
    texto(ctx, "21,4 °C   48 %", w / 2, 230, 26, 700, "center");
  });

/** Pantalla de la estación meteorológica: temperatura grande, humedad, presión y luz */
export const texturaPantallaEstacion = () =>
  textura(760, 440, (ctx, w, h) => {
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, w, h);
    const claro = "#e9f6ff";
    const azul = "#7fc8ff";
    // Sol con nube (arriba a la derecha)
    ctx.fillStyle = "#ffd25e";
    ctx.beginPath();
    ctx.arc(612, 92, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd25e";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(612 + Math.cos(a) * 46, 92 + Math.sin(a) * 46);
      ctx.lineTo(612 + Math.cos(a) * 60, 92 + Math.sin(a) * 60);
      ctx.stroke();
    }
    ctx.fillStyle = claro;
    for (const [x, y, r] of [
      [640, 130, 34],
      [600, 140, 28],
      [676, 142, 26],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(580, 140, 120, 30);
    // Temperatura
    ctx.fillStyle = claro;
    texto(ctx, "21,5", 44, 116, 150, 700);
    texto(ctx, "°C", 360, 82, 56, 600);
    ctx.fillStyle = azul;
    texto(ctx, "TEMPERATURA", 50, 228, 24, 600);
    // Línea y tres datos abajo
    ctx.fillStyle = "#1f2a36";
    ctx.fillRect(44, 262, w - 88, 4);
    const datos = [
      ["HUMEDAD", "56 %"],
      ["PRESIÓN", "1013 hPa"],
      ["LUZ", "640 lx"],
    ];
    datos.forEach(([nombre, valor], i) => {
      const x = 50 + i * 230;
      ctx.fillStyle = azul;
      texto(ctx, nombre, x, 306, 24, 600);
      ctx.fillStyle = claro;
      texto(ctx, valor, x, 360, 46, 700);
    });
    // Wifi conectado
    ctx.strokeStyle = azul;
    ctx.lineWidth = 6;
    for (const r of [14, 26, 38]) {
      ctx.beginPath();
      ctx.arc(700, 410, r, 1.25 * Math.PI, 1.75 * Math.PI);
      ctx.stroke();
    }
  });

/** Protoboard de 400 puntos: 30 columnas × 10 filas y dos raíles a cada lado */
export const texturaProtoboard400 = () =>
  textura(1660, 1100, (ctx, w, h) => {
    ctx.fillStyle = "#f4f3ef";
    ctx.fillRect(0, 0, w, h);
    const paso = 50;
    const x0 = 105;
    const agujero = (x: number, y: number) => {
      ctx.fillStyle = "#2b2b2b";
      ctx.fillRect(x - 9, y - 9, 18, 18);
      ctx.fillStyle = "#0f0f0f";
      ctx.fillRect(x - 6, y - 6, 12, 12);
    };
    // Raíles de alimentación (arriba y abajo), en grupos de 5
    for (const [y, rojoArriba] of [
      [70, true],
      [h - 120, false],
    ] as const) {
      for (let fila = 0; fila < 2; fila++)
        for (let i = 0; i < 25; i++)
          agujero(x0 + 25 + i * paso + Math.floor(i / 5) * 18, y + fila * paso);
      ctx.fillStyle = "#d6312b";
      ctx.fillRect(x0, rojoArriba ? y - 38 : y + paso + 30, w - 2 * x0, 5);
      ctx.fillStyle = "#2c5fd1";
      ctx.fillRect(x0, rojoArriba ? y + paso + 30 : y - 38, w - 2 * x0, 5);
    }
    // Zona central: 5 filas arriba, canal, 5 filas abajo
    const letras = "jihgfedcba";
    for (let fila = 0; fila < 10; fila++) {
      const y = 290 + fila * paso + (fila >= 5 ? 70 : 0);
      ctx.fillStyle = "#9a9a96";
      texto(ctx, letras[fila], 60, y, 22, 600, "center");
      texto(ctx, letras[fila], w - 60, y, 22, 600, "center");
      for (let col = 0; col < 30; col++) agujero(x0 + 25 + col * 48.5, y);
    }
    ctx.fillStyle = "#e3e1db";
    ctx.fillRect(0, 290 + 4 * paso + 35, w, 36);
    ctx.fillStyle = "#9a9a96";
    for (let col = 0; col < 30; col += 5)
      texto(ctx, String(col + 1), x0 + 25 + col * 48.5, 250, 20, 600, "center");
  });

/** Espiral de un muelle de contacto (relieve no hace falta: es geometría). Sombra suave del suelo */
export const texturaSombraSuave = () =>
  textura(256, 256, (ctx) => {
    const d = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    d.addColorStop(0, "rgba(11,11,11,0.30)");
    d.addColorStop(0.6, "rgba(11,11,11,0.10)");
    d.addColorStop(1, "rgba(11,11,11,0)");
    ctx.fillStyle = d;
    ctx.fillRect(0, 0, 256, 256);
  });

/** Relieve fino para plástico mate (evita que parezca de ordenador) */
export const texturaGrano = () => {
  const t = textura(256, 256, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    let s = 3;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (s * 16807) % 2147483647;
      const v = 118 + ((s / 2147483647) * 20 - 10);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });
  t.colorSpace = NoColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
};
