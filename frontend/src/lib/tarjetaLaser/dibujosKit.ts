/**
 * DIBUJOS DE CADA KIT PARA LA CARA TRASERA
 * Ilustración de línea (grabada) que ocupa la zona derecha de la trasera: x de 53 a 82,6 mm e
 * y de 3 a 43 mm (debajo va la línea del pie). Lo que pase de 3 mm del borde se recorta.
 * Donde una pieza pasa por delante de otra, a la de detrás se le quita un pequeño margen
 * alrededor de la de delante (`detras`), para que las líneas no se crucen ni se amontonen. Cada kit tiene la suya según su slug; si el kit no
 * tiene dibujo propio (por ejemplo, uno creado después desde el panel), se usan pistas de circuito.
 */
import { circulo, contorno, rect, rectRedondeado, sentido, trazado, type Punto } from "./geometria";
import type { Forma } from "./fusion";
import { medirTexto, textoComoTrazado } from "./texto";

/** Grosor de las líneas del dibujo (mm) */
const L = 0.4;
/** Ancho de la tarjeta (lo que pase de la zona de dibujo se recorta) */
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

/** Forma que queda por detrás: se le quita lo que tapan las de delante (con su margen) */
const detras = (d: string, ...tapas: Punto[][]): Forma => ({
  d,
  menos: tapas.map((t) => trazado(sentido(t, true))).join(""),
});
/** Margen que se deja alrededor de lo que queda por delante (mm) */
const HUECO = 0.45;

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

function coche(): Forma[] {
  const g: Forma[] = [];
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

  // La línea del circuito: se corta limpia delante y detrás del coche
  g.push(detras(linea(circuito, 1.7), rect(xl - 9, 7.1, 18, 23.3)));

  const sil = (pol: Punto[], w = L) => silueta(pol.map(T), w);
  const relleno = (pol: Punto[]) => trazado(sentido(pol.map(T), true));

  // Chasis
  g.push(sil(caja(-8.5, -11, 17, 22, 3.5)));
  // Sensor de ultrasonidos delante: placa con los dos "ojos" redondos
  g.push(sil(caja(-7.8, -16.6, 15.6, 4.8, 0.6), 0.32));
  for (const x of [-3.9, 3.9]) {
    g.push(aro(...T([x, -14.2]), 1.95 * S, 0.36));
    g.push(aro(...T([x, -14.2]), 1.15 * S, 0.22));
    g.push(disco(...T([x, -14.2]), 0.35));
  }
  g.push(relleno(rect(-0.9, -14.9, 1.8, 0.9)));
  // Placa Arduino con sus pines, el chip y el conector USB
  g.push(sil(caja(-5.6, -9.6, 11.2, 8, 0.7), 0.32));
  for (let i = 0; i < 8; i++) g.push(relleno(rect(-4.6 + i * 1.2, -8.8, 0.55, 0.55)));
  g.push(relleno(rect(-1.2, -5.6, 4.8, 1.6)));
  g.push(relleno(rect(-7, -6.6, 2.2, 2.4)));
  g.push(relleno(rect(-4.2, -3.6, 1.6, 1.3)));
  // Portabaterías con las 2 baterías recargables 18650
  g.push(sil(caja(-4.6, 0.4, 9.2, 9, 0.6), 0.32));
  for (const x of [-2.2, 2.2]) g.push(sil(capsula([x, 2.4], [x, 7.4], 1.45), 0.25));
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

function brazo(): Forma[] {
  const g: Forma[] = [];
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
  const hombro: Punto = [66, 29.6];
  const codo: Punto = [69.6, 13.6];
  const muneca: Punto = [79.4, 18.6];
  const rHombro = 2.7;
  const rCodo = 2.4;
  const rMuneca = 2.1;
  // Zonas que tapan las piezas de delante (con su margen)
  const tapaJunta = ([x, y]: Punto, r: number) => circulo(x, y, r + HUECO);
  const tapaPieza = (a: Punto, b: Punto, r: number) => capsula(a, b, r + L / 2 + HUECO);

  // Flecha de giro alrededor de la base (va por delante de la base)
  const giro = arcoElipse(66, 34.7, 9.4, 2.3, 25, 155, 24);
  const tapaGiro = contorno(giro.slice(0, -1), 0.32 + 2 * HUECO);
  g.push(linea(giro.slice(0, -1), 0.32));
  g.push(flecha(giro[giro.length - 3], giro[giro.length - 2], 1.4, 1.2));
  // Base con tornillos y plataforma giratoria
  g.push(
    detras(
      silueta([
        [58.6, suelo - 0.5],
        [60.8, 36.4],
        [71.2, 36.4],
        [73.4, suelo - 0.5],
      ]),
      tapaGiro,
    ),
  );
  g.push(disco(62.2, 38.3, 0.45), disco(69.8, 38.3, 0.45));
  g.push(detras(silueta(caja(60.4, 33.4, 11.2, 2.6, 0.7), 0.35), tapaGiro));

  // Brazo y antebrazo: piezas con un hueco alargado para aligerar
  const pieza = (a: Punto, b: Punto, r: number) => {
    const at = (t: number): Punto => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    return silueta(capsula(a, b, r)) + silueta(capsula(at(0.3), at(0.7), r * 0.32), 0.3);
  };
  // De atrás hacia delante: servo del hombro, brazo, antebrazo y articulaciones
  g.push(
    detras(
      silueta(caja(62.3, 26.6, 7.4, 6.6, 0.8), 0.35),
      tapaJunta(hombro, rHombro),
      tapaPieza(hombro, codo, 2.1),
    ),
  );
  g.push(
    detras(
      pieza(hombro, codo, 2.1),
      tapaJunta(hombro, rHombro),
      tapaJunta(codo, rCodo),
      tapaPieza(codo, muneca, 1.8),
    ),
  );
  g.push(detras(pieza(codo, muneca, 1.8), tapaJunta(codo, rCodo), tapaJunta(muneca, rMuneca)));
  // Articulaciones: disco del servo con tornillo central y 4 tornillos alrededor
  const articulacion = ([x, y]: Punto, r: number) => {
    g.push(pad(x, y, r, r * 0.62), disco(x, y, r * 0.28));
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      g.push(disco(x + r * 0.45 * Math.cos(a), y + r * 0.45 * Math.sin(a), 0.2));
    }
  };
  articulacion(hombro, rHombro);
  articulacion(codo, rCodo);
  articulacion(muneca, rMuneca);
  // Muñeca y pinza cerrada sujetando el cubo
  g.push(detras(silueta(caja(78.2, 21.2, 2.4, 1.9, 0.3), 0.35), tapaJunta(muneca, rMuneca)));
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
  return g;
}

// ── Estación meteorológica: sol y nube sobre la pantalla con los datos ───────────────────

function estacion(): Forma[] {
  const g: Forma[] = [];
  // Nube: tres círculos y una base recta (rellena)
  const piezasNube = (m: number): Punto[][] => [
    circulo(62.4, 13.3, 2.4 + m),
    circulo(66.4, 11.3, 3.4 + m),
    circulo(70.6, 13.2, 2.5 + m),
    rect(62.4 - m, 13.2 - m, 8.2 + 2 * m, 2.5 + 2 * m),
  ];
  g.push(...piezasNube(0).map((p) => trazado(p)));
  // Sol con rayos asomando por detrás de la nube
  const sol: Punto = [62.5, 9.5];
  const tapaNube = piezasNube(0.6);
  g.push(detras(trazado(circulo(...sol, 3.1)), ...tapaNube));
  for (let i = 0; i < 6; i++) {
    const a = ((150 + i * 39) * Math.PI) / 180;
    const p = (r: number): Punto => [sol[0] + r * Math.cos(a), sol[1] + r * Math.sin(a)];
    g.push(detras(linea([p(4.2), p(5.7)], 0.45), ...tapaNube));
  }

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
  g.push(
    detras(
      silueta(capsula([77.6, 5], [77.6, 11.5], 1.2), 0.35),
      circulo(77.6, 13.6, 1.8 + 0.18 + HUECO),
    ),
  );
  g.push(
    aro(77.6, 13.6, 1.8, 0.35),
    disco(77.6, 13.6, 1.05),
    linea(
      [
        [77.6, 8],
        [77.6, 12.6],
      ],
      0.6,
    ),
  );
  // Gota (humedad)
  const gota: Punto[] = [[73.5, 3.6], ...arco(73.5, 7.4, 1.6, -30, 210, 14)];
  g.push(silueta(gota, 0.35));
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

function circuito(): Forma[] {
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

const DIBUJOS: Record<string, () => Forma[]> = {
  "coche-seguidor-de-lineas": coche,
  "brazo-robotico": brazo,
  "estacion-meteorologica": estacion,
};

/** Formas del dibujo del kit (o las pistas de circuito si el kit no tiene dibujo propio) */
export function dibujoKit(slug?: string): Forma[] {
  return (slug && DIBUJOS[slug]?.()) || circuito();
}
