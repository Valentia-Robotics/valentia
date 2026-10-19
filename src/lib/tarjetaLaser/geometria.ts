/**
 * GEOMETRÍA PARA EL LÁSER
 * El programa del láser graba superficies rellenas, no líneas con grosor: por eso todo se dibuja como
 * polígonos. Medidas en milímetros, con la y hacia abajo (como en SVG).
 *
 * Sentido de giro: los rellenos van en sentido horario y los agujeros en antihorario. Así el
 * resultado es el mismo con cualquier regla de relleno ("nonzero" o "evenodd") del programa del láser.
 */

export type Punto = [number, number];
export type Poligono = Punto[];

const f = (n: number) => +n.toFixed(3);

/** Polígono como datos de un <path> de SVG */
export const trazado = (pol: Poligono) =>
  "M" + pol.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";

/** Área con signo: positiva = sentido horario (con la y hacia abajo) */
function area(pol: Poligono) {
  let s = 0;
  pol.forEach((p, i) => {
    const q = pol[(i + 1) % pol.length];
    s += p[0] * q[1] - q[0] * p[1];
  });
  return s / 2;
}

/** Devuelve el polígono girando en el sentido pedido (horario = relleno, antihorario = agujero) */
export const sentido = (pol: Poligono, horario: boolean): Poligono =>
  area(pol) > 0 === horario ? pol : [...pol].reverse();

/** Contorno de una línea quebrada con grosor `w` (uniones en inglete y extremos rectos) */
export function contorno(pts: Punto[], w: number): Poligono {
  const h = w / 2;
  const normales: Punto[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dy = pts[i + 1][1] - pts[i][1];
    const l = Math.hypot(dx, dy);
    normales.push([-dy / l, dx / l]);
  }
  const lado = (s: number): Punto[] =>
    pts.map((p, k) => {
      if (k === 0) return [p[0] + s * h * normales[0][0], p[1] + s * h * normales[0][1]];
      const a = normales[k - 1];
      if (k === pts.length - 1) return [p[0] + s * h * a[0], p[1] + s * h * a[1]];
      const b = normales[k];
      const d = 1 + a[0] * b[0] + a[1] * b[1];
      return [p[0] + (s * h * (a[0] + b[0])) / d, p[1] + (s * h * (a[1] + b[1])) / d];
    });
  return sentido([...lado(1), ...lado(-1).reverse()], true);
}

/** Recorta un polígono a un rectángulo (algoritmo de Sutherland–Hodgman) */
export function recortar(pol: Poligono, x0: number, y0: number, x1: number, y1: number): Poligono {
  const bordes: [(p: Punto) => boolean, (a: Punto, b: Punto) => Punto][] = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  let salida = pol;
  for (const [dentro, corte] of bordes) {
    const entrada = salida;
    salida = [];
    entrada.forEach((b, i) => {
      const a = entrada[(i + entrada.length - 1) % entrada.length];
      if (dentro(b)) {
        if (!dentro(a)) salida.push(corte(a, b));
        salida.push(b);
      } else if (dentro(a)) salida.push(corte(a, b));
    });
  }
  return salida;
}

export const rect = (x: number, y: number, w: number, h: number, horario = true) =>
  sentido(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    horario,
  );

export function rectRedondeado(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  horario = true,
): Poligono {
  const pts: Poligono = [];
  const esquinas: [number, number, number][] = [
    [x + w - r, y + r, -90],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, 90],
    [x + r, y + r, 180],
  ];
  const pasos = 8;
  for (const [cx, cy, a0] of esquinas)
    for (let i = 0; i <= pasos; i++) {
      const a = ((a0 + (90 * i) / pasos) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  return sentido(pts, horario);
}

export function circulo(cx: number, cy: number, r: number, horario = true): Poligono {
  const pasos = 48;
  return sentido(
    Array.from({ length: pasos }, (_, i): Punto => {
      const a = (2 * Math.PI * i) / pasos;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }),
    horario,
  );
}
