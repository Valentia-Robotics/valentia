/**
 * Las piezas del robot de la portada: el texto de cada paso y hacia dónde se mueve al despiezarse.
 * Lo usan la versión 3D (escenaRobot.ts) y la versión ligera en SVG (RobotEstatico.tsx).
 * Es un archivo pequeño y sin "three", así que se puede importar sin coste.
 */

export interface PiezaRobot {
  id: "chasis" | "placa" | "motores" | "sensores" | "bateria";
  titulo: string;
  texto: string;
  /** Desplazamiento al despiezarse en la escena 3D (x, y, z) */
  direccion3d: [number, number, number];
  /** Desplazamiento al despiezarse en el dibujo SVG (x, y), en unidades del dibujo */
  direccion2d: [number, number];
}

export const PIEZAS_ROBOT: PiezaRobot[] = [
  {
    id: "chasis",
    titulo: "El chasis",
    texto: "La base donde se monta todo. Ligera, resistente y lista para atornillar.",
    direccion3d: [0, -0.3, 0],
    direccion2d: [0, 30],
  },
  {
    id: "placa",
    titulo: "La placa",
    texto: "El cerebro del robot. Aquí cargas tu programa y decides cómo se comporta.",
    direccion3d: [0.35, 0.95, -0.1],
    direccion2d: [0, -120],
  },
  {
    id: "motores",
    titulo: "Motores y ruedas",
    texto: "Los músculos. Le dan movimiento para avanzar, girar y frenar.",
    direccion3d: [-0.65, -0.1, 0],
    direccion2d: [-40, 80],
  },
  {
    id: "sensores",
    titulo: "Los sensores",
    texto: "Sus sentidos. Ven las líneas del suelo y los obstáculos que tiene delante.",
    direccion3d: [1.05, 0.3, 0],
    direccion2d: [110, -20],
  },
  {
    id: "bateria",
    titulo: "La batería",
    texto: "Dos baterías recargables: la energía para que funcione solo, sin cables, durante horas.",
    direccion3d: [-0.7, 0.8, -0.4],
    direccion2d: [-110, -70],
  },
];

/** Suaviza la transición entre 0 y 1 (empieza y acaba despacio) */
function suavizar(desde: number, hasta: number, valor: number) {
  const t = Math.min(1, Math.max(0, (valor - desde) / (hasta - desde)));
  return t * t * (3 - 2 * t);
}

/**
 * Cuánto está despiezado el robot (0 = montado, 1 = despiezado) según el scroll:
 * se despieza al principio de la sección, se queda así mientras se leen los pasos
 * y se vuelve a montar al final.
 */
export function explosionDesdeProgreso(progreso: number): number {
  return suavizar(0.04, 0.22, progreso) * (1 - suavizar(0.86, 0.98, progreso));
}

// Tramo del scroll en el que se explican las piezas (una detrás de otra, a partes iguales)
const INICIO_PIEZAS = 0.2;
const FIN_PIEZAS = 0.88;

/** Progreso del scroll en el centro del tramo de la pieza i (donde la página «se para») */
export function centroDePieza(indice: number): number {
  return INICIO_PIEZAS + ((indice + 0.5) / PIEZAS_ROBOT.length) * (FIN_PIEZAS - INICIO_PIEZAS);
}

/** Qué pieza se está explicando según el scroll (null al principio y al final) */
export function piezaActiva(progreso: number): PiezaRobot["id"] | null {
  if (progreso < INICIO_PIEZAS || progreso > FIN_PIEZAS) return null;
  const tramo = (progreso - INICIO_PIEZAS) / (FIN_PIEZAS - INICIO_PIEZAS);
  const indice = Math.min(PIEZAS_ROBOT.length - 1, Math.floor(tramo * PIEZAS_ROBOT.length));
  return PIEZAS_ROBOT[indice].id;
}
