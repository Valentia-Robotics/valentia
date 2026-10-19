/**
 * DIBUJOS DE CADA KIT PARA LA CARA TRASERA
 * Ilustración de línea (grabada) que ocupa la zona derecha de la trasera: x de 53 a 85,6 mm e
 * y de 3 a 43 mm (debajo va la línea del pie). Cada kit tiene la suya según su slug; si el kit no
 * tiene dibujo propio (por ejemplo, uno creado después desde el panel), se usan pistas de circuito.
 */
import { circulo, contorno, rect, rectRedondeado, sentido, trazado, type Punto } from "./geometria";
import { medirTexto, textoComoTrazado } from "./texto";

/** Grosor de las líneas del dibujo (mm) */
const L = 0.4;
/** Ancho de la tarjeta: lo que pasa de aquí se corta con ella (sirve de sangrado) */
const BORDE = 85.6;

const linea = (pts: Punto[], w = L) => trazado(contorno(pts, w));
const disco = (cx: number, cy: number, r: number) => trazado(circulo(cx, cy, r, true));
/** Aro: círculo grabado con el centro sin grabar */
const aro = (cx: number, cy: number, r: number, w = L) =>
  trazado(circulo(cx, cy, r + w / 2, true)) + trazado(circulo(cx, cy, r - w / 2, false));
/** Punto con agujero (para articulaciones y pads) */
const pad = (cx: number, cy: number, r: number, agujero: number) =>
  trazado(circulo(cx, cy, r, true)) + trazado(circulo(cx, cy, agujero, false));

/** Arco de circunferencia como lista de puntos (ángulos en grados, 0 = derecha, sentido horario) */
function arco(cx: number, cy: number, r: number, a0: number, a1: number, pasos = 16): Punto[] {
  return Array.from({ length: pasos + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / pasos) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

/** Desplaza un polígono cerrado y convexo `d` mm hacia fuera (d > 0) o hacia dentro (d < 0) */
function desplazar(pol: Punto[], d: number): Punto[] {
  const p = sentido(pol, true);
  const n = p.length;
  const normales = p.map((a, i): Punto => {
    const b = p[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // Con la y hacia abajo y sentido horario, la normal exterior es (dy, -dx)
    return [(b[1] - a[1]) / l, -(b[0] - a[0]) / l];
  });
  return p.map((v, i) => {
    const a = normales[(i + n - 1) % n];
    const b = normales[i];
    const k = 1 + a[0] * b[0] + a[1] * b[1];
    return [v[0] + (d * (a[0] + b[0])) / k, v[1] + (d * (a[1] + b[1])) / k];
  });
}

/** Contorno de una figura cerrada (convexa) con grosor `w`: solo la línea, el interior sin grabar */
function silueta(pol: Punto[], w = L) {
  return (
    trazado(sentido(desplazar(pol, w / 2), true)) + trazado(sentido(desplazar(pol, -w / 2), false))
  );
}

/** Rectángulo de esquinas redondeadas sin repetir el primer punto (desplazar necesita vértices distintos) */
const caja = (x: number, y: number, w: number, h: number, r: number) =>
  rectRedondeado(x, y, w, h, r).filter(
    (p, i, todos) => i === 0 || Math.hypot(p[0] - todos[i - 1][0], p[1] - todos[i - 1][1]) > 1e-6,
  );

/** Barra con extremos redondeados entre dos puntos (silueta de un segmento del brazo) */
function capsula(a: Punto, b: Punto, r: number): Punto[] {
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return [
    ...arco(b[0], b[1], r, ang - 90, ang + 90, 10),
    ...arco(a[0], a[1], r, ang + 90, ang + 270, 10),
  ];
}

// ── Coche seguidor de líneas: visto desde arriba, encima de la línea negra que sigue ─────────

function coche(): string[] {
  const g: string[] = [];
  const cx = 70;
  // La línea del circuito: entra por la derecha, gira, pasa por debajo del coche y sale por arriba
  const ancho = 1.6;
  g.push(linea([[BORDE + 1, 39.5], ...arco(76, 33.5, 6, 90, 180, 12), [cx, 31.2]], ancho));
  g.push(linea([[cx, 7.2], ...arco(64, 5, 6, 0, -90, 12)], ancho));

  // Chasis (más estrecho por delante)
  g.push(
    silueta([
      [63.6, 12],
      [76.4, 12],
      [79, 14.6],
      [79, 31],
      [61, 31],
      [61, 14.6],
    ]),
  );
  // Ruedas (motores con reductora) a los lados, con su dibujo de goma
  for (const x of [57.4, 79.4]) {
    g.push(silueta(caja(x, 20, 3.2, 10, 0.9), 0.35));
    for (let i = 0; i < 5; i++) g.push(trazado(rect(x + 0.7, 21.1 + i * 1.8, 1.8, 0.6)));
  }
  // La línea sigue por debajo del coche (a trazos)
  for (const y of [13.2, 15.4, 26.2, 28.4]) g.push(trazado(rect(cx - 0.8, y, 1.6, 1.2)));
  // Placa (Arduino) con su fila de pines
  g.push(silueta(caja(64.5, 17.5, 11, 7.5, 0.8), 0.32));
  for (let i = 0; i < 7; i++) g.push(trazado(rect(65.6 + i * 1.3, 18.4, 0.6, 0.6)));
  g.push(trazado(rect(65.6, 22.6, 3.2, 1.6)));
  // Sensores infrarrojos de línea, uno a cada lado de la línea
  g.push(silueta(caja(66, 13.4, 2, 2, 0.3), 0.3), silueta(caja(72, 13.4, 2, 2, 0.3), 0.3));
  // Sensor de ultrasonidos delante ("los ojos")
  g.push(silueta(caja(62.5, 7.4, 15, 4.2, 0.6), 0.32));
  g.push(aro(66.2, 9.5, 1.45), aro(73.8, 9.5, 1.45));
  g.push(disco(66.2, 9.5, 0.45), disco(73.8, 9.5, 0.45));
  return g;
}

// ── Brazo robótico: de perfil, a punto de coger un cubo ─────────────────────────────────

function brazo(): string[] {
  const g: string[] = [];
  const suelo = 40.5;
  g.push(
    linea(
      [
        [54, suelo],
        [BORDE + 1, suelo],
      ],
      0.35,
    ),
  );
  // Base giratoria
  g.push(
    silueta([
      [58.5, suelo - 0.4],
      [60.5, 35],
      [70.5, 35],
      [72.5, suelo - 0.4],
    ]),
  );
  g.push(silueta(caja(61, 32.4, 9, 2.6, 0.8), 0.35));
  // Giro de la base (flecha discontinua alrededor)
  const hombro: Punto = [65.5, 30.5];
  const codo: Punto = [69, 15];
  const muneca: Punto = [79.5, 19.5];
  g.push(silueta(capsula(hombro, codo, 1.9)));
  g.push(silueta(capsula(codo, muneca, 1.6)));
  // Articulaciones (servos)
  g.push(pad(...hombro, 2.4, 0.8), pad(...codo, 2.1, 0.7), pad(...muneca, 1.8, 0.6));
  // Pinza abierta, apuntando al cubo
  g.push(
    linea(
      [
        [muneca[0], muneca[1] + 1.8],
        [muneca[0], 23.2],
      ],
      0.5,
    ),
  );
  g.push(
    linea([
      [77.2, 23.2],
      [81.8, 23.2],
    ]),
  );
  g.push(
    linea([
      [77.4, 23.2],
      [76.6, 27.6],
      [77.6, 28.6],
    ]),
  );
  g.push(
    linea([
      [81.6, 23.2],
      [82.4, 27.6],
      [81.4, 28.6],
    ]),
  );
  // Cubo en el suelo y marcas de movimiento
  g.push(silueta(caja(77, 35.4, 5, 5, 0.4)));
  g.push(
    linea(
      [
        [79.5, 30.4],
        [79.5, 31.8],
      ],
      0.3,
    ),
    linea(
      [
        [79.5, 32.6],
        [79.5, 33.6],
      ],
      0.3,
    ),
  );
  g.push(linea(arco(...codo, 6.2, 215, 265, 10), 0.3));
  g.push(linea(arco(...codo, 7.6, 220, 258, 10), 0.3));
  return g;
}

// ── Estación meteorológica: sol y nube sobre la pantalla con los datos ───────────────────

function estacion(): string[] {
  const g: string[] = [];
  // Sol con rayos asomando detrás de la nube
  const sol: Punto = [62.5, 9.5];
  g.push(trazado(sentido(arco(...sol, 3.1, 150, 345, 18), true)));
  for (let i = 0; i < 6; i++) {
    const a = ((150 + i * 39) * Math.PI) / 180;
    const p = (r: number): Punto => [sol[0] + r * Math.cos(a), sol[1] + r * Math.sin(a)];
    g.push(linea([p(4.2), p(5.7)], 0.45));
  }
  // Nube (silueta hecha con arcos)
  const nube: Punto[] = [
    ...arco(62.2, 13.2, 2.6, 90, 270, 10),
    ...arco(66.4, 10.8, 3.6, 200, 330, 12),
    ...arco(71, 12.4, 2.4, 270, 450, 10),
  ];
  g.push(trazado(sentido(nube, true)));

  // Pantalla OLED: marco, temperatura grande y humedad/presión debajo
  g.push(silueta(caja(55.5, 18.5, 27, 17, 2)));
  g.push(silueta(caja(57.3, 20.3, 23.4, 13.4, 0.8), 0.3));
  // El símbolo de grado se dibuja aparte (no está en las letras guardadas)
  g.push(textoComoTrazado("titulo", "21,5", 59, 28.6, 6.2));
  g.push(aro(59 + medirTexto("titulo", "21,5", 6.2) + 1.3, 23.4, 0.9, 0.5));
  g.push(textoComoTrazado("mono", "56%  1013hPa", 69, 32.3, 1.55, { alinear: "centro" }));
  // Pines de la pantalla
  for (let i = 0; i < 4; i++) g.push(trazado(rect(63.6 + i * 3, 36, 0.9, 2.2)));
  // Termómetro a la derecha de la nube
  g.push(silueta(capsula([78.5, 5], [78.5, 11.5], 1.2), 0.35));
  g.push(
    aro(78.5, 13.6, 1.8, 0.35),
    disco(78.5, 13.6, 1.05),
    linea(
      [
        [78.5, 8],
        [78.5, 12.6],
      ],
      0.6,
    ),
  );
  // Gota (humedad)
  const gota: Punto[] = [[73.5, 3.6], ...arco(73.5, 7.4, 1.6, -30, 210, 14)];
  g.push(silueta(gota, 0.35));
  // Pistas que salen hacia el borde, como si la estación estuviera conectada
  g.push(
    linea(
      [
        [82.5, 27],
        [BORDE + 1, 27],
      ],
      0.35,
    ),
    linea(
      [
        [82.5, 30],
        [BORDE + 1, 30],
      ],
      0.35,
    ),
  );
  return g;
}

// ── Sin dibujo propio: pistas de circuito ───────────────────────────────────────────────

function pista(pts: Punto[]) {
  const rPad = 0.85;
  const [a, b] = pts.slice(-2);
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const fin: Punto = [b[0] - ((b[0] - a[0]) / l) * rPad, b[1] - ((b[1] - a[1]) / l) * rPad];
  return [linea([...pts.slice(0, -1), fin], 0.35), pad(b[0], b[1], rPad, rPad * 0.45)];
}

function circuito(): string[] {
  const xb = BORDE + 1;
  return [
    ...pista([
      [xb, 4.8],
      [70, 4.8],
      [67.5, 7.3],
      [58, 7.3],
    ]),
    ...pista([
      [xb, 8.5],
      [76, 8.5],
      [72, 12.5],
      [64, 12.5],
    ]),
    ...pista([
      [xb, 14],
      [79, 14],
      [75, 18],
      [75, 26],
    ]),
    ...pista([
      [xb, 20],
      [81.5, 20],
      [81.5, 30.5],
      [78, 34],
      [68, 34],
    ]),
  ];
}

const DIBUJOS: Record<string, () => string[]> = {
  "coche-seguidor-de-lineas": coche,
  "brazo-robotico": brazo,
  "estacion-meteorologica": estacion,
};

/** Formas del dibujo del kit (o las pistas de circuito si el kit no tiene dibujo propio) */
export function dibujoKit(slug?: string): string[] {
  return (slug && DIBUJOS[slug]?.()) || circuito();
}
