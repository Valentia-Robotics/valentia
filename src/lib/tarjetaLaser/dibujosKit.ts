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

/** Arco de elipse (para dibujar círculos vistos en perspectiva) */
function arcoElipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a0: number,
  a1: number,
  pasos = 24,
): Punto[] {
  return arco(0, 0, 1, a0, a1, pasos).map(([x, y]): Punto => [cx + rx * x, cy + ry * y]);
}

/** Punta de flecha (triángulo) en `p`, apuntando en la dirección de `desde` → `p` */
function flecha(desde: Punto, p: Punto, largo = 1.5, ancho = 1.3): string {
  const l = Math.hypot(p[0] - desde[0], p[1] - desde[1]);
  const [ux, uy] = [(p[0] - desde[0]) / l, (p[1] - desde[1]) / l];
  return trazado(
    sentido(
      [
        [p[0] + ux * largo, p[1] + uy * largo],
        [p[0] - (uy * ancho) / 2, p[1] + (ux * ancho) / 2],
        [p[0] + (uy * ancho) / 2, p[1] - (ux * ancho) / 2],
      ],
      true,
    ),
  );
}

// ── Coche seguidor de líneas: visto desde arriba, recorriendo la curva del circuito ─────────

function coche(): string[] {
  const g: string[] = [];
  // Circuito: baja recto desde arriba, gira y sale por el borde derecho
  const xl = 66.5;
  const circuito: Punto[] = [
    [xl, -2],
    [xl, 30.5],
    ...arco(xl + 7.5, 30.5, 7.5, 180, 90, 14).slice(1),
    [BORDE + 2, 38],
  ];
  // El coche va sobre la recta, hacia arriba
  const S = 0.8; // escala del coche
  const centro: Punto = [xl, 21];
  const F: Punto = [0, -1]; // hacia delante
  const R: Punto = [-F[1], F[0]]; // hacia su derecha
  // Coordenadas del coche: x a su derecha, y negativa hacia delante
  const T = ([x, y]: Punto): Punto => [
    centro[0] + S * (x * R[0] - y * F[0]),
    centro[1] + S * (x * R[1] - y * F[1]),
  ];
  const local = ([px, py]: Punto): Punto => {
    const [dx, dy] = [px - centro[0], py - centro[1]];
    return [(dx * R[0] + dy * R[1]) / S, -(dx * F[0] + dy * F[1]) / S];
  };

  // La línea del circuito (más puntos para poder quitar lo que queda debajo del coche)
  const puntos: Punto[] = [];
  circuito.forEach((p, i) => {
    const q = circuito[i + 1];
    const n = q ? Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.5)) : 1;
    for (let k = 0; k < n; k++)
      puntos.push(q ? [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n] : p);
  });
  // Meta a cuadros sobre la línea, arriba
  const yMeta = 2.6;
  const tramos: Punto[][] = [[]];
  for (const p of puntos) {
    const [x, y] = local(p);
    const tapado =
      (Math.abs(x) < 10 && y > -18.2 && y < 11.6) || (p[1] > yMeta - 0.3 && p[1] < yMeta + 2.3);
    if (tapado) {
      if (tramos[tramos.length - 1].length) tramos.push([]);
    } else tramos[tramos.length - 1].push(p);
  }
  for (const t of tramos) if (t.length > 1) g.push(linea(t, 1.7));
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 2; j++)
      if ((i + j) % 2 === 0) g.push(trazado(rect(xl - 3 + i, yMeta + j, 1, 1)));
  g.push(silueta(rect(xl - 3, yMeta, 6, 2), 0.2));

  const sil = (pol: Punto[], w = L) => silueta(pol.map(T), w);
  const relleno = (pol: Punto[]) => trazado(sentido(pol.map(T), true));

  // Chasis
  g.push(sil(caja(-8.5, -11, 17, 22, 3.5)));
  // Sensor de ultrasonidos delante: placa y los dos "ojos" con su rejilla
  g.push(sil(caja(-7.2, -14.6, 14.4, 3.2, 0.5), 0.32));
  for (const x of [-3.7, 3.7]) {
    g.push(sil(caja(x - 1.6, -17.6, 3.2, 3, 0.4), 0.32));
    for (let i = 0; i < 3; i++) g.push(relleno(rect(x - 1, -17 + i * 0.85, 2, 0.32)));
  }
  // Placa Arduino con sus pines, el chip y el conector USB
  g.push(sil(caja(-5.6, -9.6, 11.2, 8, 0.7), 0.32));
  for (let i = 0; i < 8; i++) g.push(relleno(rect(-4.6 + i * 1.2, -8.8, 0.55, 0.55)));
  g.push(relleno(rect(-1.2, -5.6, 4.8, 1.6)));
  g.push(relleno(rect(-7, -6.6, 2.2, 2.4)));
  g.push(relleno(rect(-4.2, -3.6, 1.6, 1.3)));
  // Portapilas con las 4 pilas
  g.push(sil(caja(-4.6, 0.4, 9.2, 9, 0.6), 0.32));
  for (const x of [-3.3, -1.1, 1.1, 3.3]) g.push(sil(capsula([x, 2.2], [x, 7.6], 0.75), 0.25));
  // Motores con reductora y ruedas con el dibujo de la goma
  for (const lado of [-1, 1]) {
    const xm = lado < 0 ? -8 : 5.2;
    g.push(sil(caja(xm, 2, 2.8, 6.5, 0.4), 0.3));
    const xr = lado < 0 ? -12.6 : 9.2;
    g.push(sil(caja(xr, 0.2, 3.4, 10, 1), 0.35));
    for (let i = 0; i < 6; i++) g.push(relleno(rect(xr + 0.75, 1.1 + i * 1.55, 1.9, 0.6)));
  }
  // Líneas de velocidad detrás
  for (const [x, y0, y1] of [
    [-10.9, 12.2, 16.4],
    [-6.6, 12.2, 14.4],
    [6.6, 12.2, 14.4],
    [10.9, 12.2, 16.4],
  ])
    g.push(
      linea(
        [
          [x, y0],
          [x, y1],
        ].map((p) => T(p as Punto)),
        0.35,
      ),
    );
  return g;
}

// ── Brazo robótico: de perfil, levantando un cubo ──────────────────────────────────────

function brazo(): string[] {
  const g: string[] = [];
  const suelo = 40.6;
  g.push(
    linea(
      [
        [53.5, suelo],
        [BORDE + 1, suelo],
      ],
      0.35,
    ),
  );
  // Base con tornillos y plataforma giratoria
  g.push(
    silueta([
      [58.6, suelo - 0.5],
      [60.8, 36.4],
      [71.2, 36.4],
      [73.4, suelo - 0.5],
    ]),
  );
  g.push(disco(62.2, 38.3, 0.45), disco(69.8, 38.3, 0.45));
  g.push(silueta(caja(60.4, 33.4, 11.2, 2.6, 0.7), 0.35));
  // Flecha de giro alrededor de la base
  const giro = arcoElipse(66, 34.7, 9.4, 2.3, 25, 155, 24);
  g.push(linea(giro.slice(0, -1), 0.32));
  g.push(flecha(giro[giro.length - 3], giro[giro.length - 2], 1.4, 1.2));

  const hombro: Punto = [66, 29.6];
  const codo: Punto = [69.6, 13.6];
  const muneca: Punto = [79.4, 18.6];
  // Brazo y antebrazo: piezas con un hueco alargado para aligerar
  const pieza = (a: Punto, b: Punto, r: number) => {
    const at = (t: number): Punto => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    return [silueta(capsula(a, b, r)), silueta(capsula(at(0.3), at(0.7), r * 0.32), 0.3)];
  };
  // Servo del hombro (caja) debajo del brazo
  g.push(silueta(caja(62.3, 26.6, 7.4, 6.6, 0.8), 0.35));
  g.push(...pieza(hombro, codo, 2.1), ...pieza(codo, muneca, 1.8));
  // Articulaciones: disco del servo con tornillo central y 4 tornillos alrededor
  const articulacion = ([x, y]: Punto, r: number) => {
    g.push(pad(x, y, r, r * 0.62), disco(x, y, r * 0.28));
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      g.push(disco(x + r * 0.45 * Math.cos(a), y + r * 0.45 * Math.sin(a), 0.2));
    }
  };
  articulacion(hombro, 2.7);
  articulacion(codo, 2.4);
  articulacion(muneca, 2.1);
  // Muñeca y pinza cerrada sujetando el cubo
  g.push(silueta(caja(78.2, 20.9, 2.4, 2.2, 0.3), 0.35));
  g.push(
    linea(
      [
        [76.2, 23.6],
        [82.6, 23.6],
      ],
      0.55,
    ),
  );
  g.push(
    linea(
      [
        [76.6, 23.6],
        [76.6, 30.2],
        [77.5, 30.9],
      ],
      0.55,
    ),
  );
  g.push(
    linea(
      [
        [82.2, 23.6],
        [82.2, 30.2],
        [81.3, 30.9],
      ],
      0.55,
    ),
  );
  g.push(silueta(caja(77.5, 25.2, 3.8, 3.8, 0.3)));
  g.push(silueta(caja(78.4, 26.1, 2, 2, 0.2), 0.25));
  // Sombra del cubo en el suelo y marcas de "subiendo"
  g.push(trazado(sentido(arcoElipse(79.4, 39.4, 3, 0.45, 0, 360, 28).slice(0, -1), true)));
  g.push(
    linea(
      [
        [74.4, 33],
        [74.4, 29.2],
      ],
      0.3,
    ),
    flecha([74.4, 30], [74.4, 29.2], 1, 1),
  );
  g.push(
    linea(
      [
        [84.4, 33],
        [84.4, 29.2],
      ],
      0.3,
    ),
    flecha([84.4, 30], [84.4, 29.2], 1, 1),
  );
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
