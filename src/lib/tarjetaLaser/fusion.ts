/**
 * FUSIÓN DE FORMAS PARA EL LÁSER
 * Junta todas las formas de una cara en una sola superficie sin solapes: si dos formas se tocan o
 * se cruzan (o una letra trae contornos superpuestos), el programa del láser podría interpretar la
 * zona común como un hueco y dejarla sin grabar. Aquí se calcula la unión real (con clipper-lib),
 * se quita lo que deba quedar sin grabar (por ejemplo, el número dentro de su círculo) y se recorta
 * todo a la zona de dibujo de la tarjeta.
 */
import ClipperLib from "clipper-lib";
import { sentido, trazado, type Poligono, type Punto } from "./geometria";

/** Una forma es el `d` de un <path>, o un `d` del que se quita otra forma (`menos`) */
export type Forma = string | { d: string; menos: string };

// Clipper trabaja con números enteros: 1 unidad = 0,1 µm
const ESCALA = 10000;

type Camino = ClipperLib.IntPoint[];

/** Convierte el `d` de un <path> (M, L, Q, C, Z en coordenadas absolutas) en polígonos */
export function poligonosDe(d: string): Poligono[] {
  const anillos: Poligono[] = [];
  let actual: Punto[] = [];
  let ultimo: Punto = [0, 0];
  for (const [, tipo, resto] of d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)) {
    const n = resto.trim()
      ? resto
          .trim()
          .split(/[\s,]+/)
          .map(Number)
      : [];
    if (tipo === "M") {
      if (actual.length > 2) anillos.push(actual);
      actual = [[n[0], n[1]]];
    } else if (tipo === "L") {
      actual.push([n[0], n[1]]);
    } else if (tipo === "Q" || tipo === "C") {
      // Las curvas se convierten en tramos rectos cortos (de sobra para el láser)
      const pasos = 10;
      const p0 = ultimo;
      for (let i = 1; i <= pasos; i++) {
        const t = i / pasos;
        const u = 1 - t;
        actual.push(
          tipo === "Q"
            ? [
                u * u * p0[0] + 2 * u * t * n[0] + t * t * n[2],
                u * u * p0[1] + 2 * u * t * n[1] + t * t * n[3],
              ]
            : [
                u * u * u * p0[0] + 3 * u * u * t * n[0] + 3 * u * t * t * n[2] + t * t * t * n[4],
                u * u * u * p0[1] + 3 * u * u * t * n[1] + 3 * u * t * t * n[3] + t * t * t * n[5],
              ],
        );
      }
    } else {
      if (actual.length > 2) anillos.push(actual);
      actual = [];
    }
    if (actual.length) ultimo = actual[actual.length - 1];
  }
  if (actual.length > 2) anillos.push(actual);
  return anillos;
}

const aCamino = (pol: Poligono): Camino =>
  pol.map(([x, y]) => ({ X: Math.round(x * ESCALA), Y: Math.round(y * ESCALA) }));

/** Operación de Clipper con relleno "nonzero" (lo normal en SVG) */
function operar(tipo: ClipperLib.ClipType, sujeto: Camino[], recorte: Camino[] = []): Camino[] {
  const c = new ClipperLib.Clipper();
  c.AddPaths(sujeto, ClipperLib.PolyType.ptSubject, true);
  if (recorte.length) c.AddPaths(recorte, ClipperLib.PolyType.ptClip, true);
  const salida: Camino[] = [];
  const nz = ClipperLib.PolyFillType.pftNonZero;
  c.Execute(tipo, salida, nz, nz);
  return salida;
}

const unir = (caminos: Camino[]) => operar(ClipperLib.ClipType.ctUnion, caminos);

/** Superficie que ocupa una forma (sin solapes, con sus huecos) */
function superficie(forma: Forma): Camino[] {
  const caminos = (d: string) => poligonosDe(d).map(aCamino);
  if (typeof forma === "string") return unir(caminos(forma));
  return operar(
    ClipperLib.ClipType.ctDifference,
    unir(caminos(forma.d)),
    unir(caminos(forma.menos)),
  );
}

/**
 * Une todas las formas, las recorta a `zona` y añade `extra` (lo que va fuera de la zona, como las
 * marcas de las esquinas). Devuelve un único `d`: contornos en sentido horario y huecos en
 * antihorario, sin cruces, así que da lo mismo la regla de relleno del programa del láser.
 */
export function fusionarFormas(formas: Forma[], zona: Poligono, extra: Forma[] = []): string {
  const dentro = operar(ClipperLib.ClipType.ctIntersection, unir(formas.flatMap(superficie)), [
    aCamino(zona),
  ]);
  const arbol = new ClipperLib.PolyTree();
  const c = new ClipperLib.Clipper();
  c.AddPaths([...dentro, ...extra.flatMap(superficie)], ClipperLib.PolyType.ptSubject, true);
  const nz = ClipperLib.PolyFillType.pftNonZero;
  c.Execute(ClipperLib.ClipType.ctUnion, arbol, nz, nz);

  const partes: string[] = [];
  const recorrer = (nodo: ClipperLib.PolyNode) => {
    for (const hijo of nodo.Childs()) {
      const pol = hijo.Contour().map((p): Punto => [p.X / ESCALA, p.Y / ESCALA]);
      if (pol.length > 2) partes.push(trazado(sentido(pol, !hijo.IsHole())));
      recorrer(hijo);
    }
  };
  recorrer(arbol);
  return partes.join("");
}
