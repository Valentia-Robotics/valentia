/**
 * COCHE SIMULADO: un coche de mentira para probar el mando sin tener el coche.
 * Se porta como el programa de la ESP32 (firmware/coche-esp32): entiende las mismas órdenes,
 * mide la distancia con un «ultrasonidos» de mentira, sigue la línea, esquiva obstáculos
 * y se para si pasa medio segundo sin recibir nada.
 *
 * Todo en centímetros. La pista es un rectángulo de 300 × 200 con una línea negra en forma de
 * circuito (dos rectas y dos curvas) y tres cajas. x hacia la derecha, y hacia abajo.
 */
import { leerOrden, type Modo } from "./protocolo.ts";

export const PISTA = { ancho: 300, alto: 200 };

/** Circuito de la línea: rectas arriba y abajo, curvas a los lados */
export const LINEA = { cx: 150, cy: 100, recta: 60, radio: 55 };

export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export const CAJAS: Caja[] = [
  { x: 8, y: 165, ancho: 28, alto: 28 },
  { x: 265, y: 8, ancho: 28, alto: 28 },
  { x: 130, y: 85, ancho: 40, alto: 30 },
];

/** Medio tamaño del coche para chocar (cm) */
export const RADIO_COCHE = 11;
/** Velocidad de una rueda al 100 % (cm/s) */
const VELOCIDAD_MAX = 60;
/** Distancia entre ruedas (cm) */
const ENTRE_RUEDAS = 13;
/** Como la ESP32: sin mensajes durante este tiempo, se para */
const MS_SIN_MENSAJES = 500;
/** Alcance del sensor de ultrasonidos (cm) */
const ALCANCE = 300;

export class CocheSimulado {
  x = 150;
  y = LINEA.cy + LINEA.radio; // empieza encima de la recta de abajo
  angulo = 0; // radianes: 0 = mirando a la derecha
  modo: Modo = "manual";
  /** Velocidad de cada rueda, de -100 a 100 */
  izq = 0;
  der = 0;
  /** Para dibujar un golpe cuando choca */
  chocado = false;

  private sinMensajes = 0;
  private girando = 0; // modo esquivar: segundos que le quedan girando

  /** Una línea que llega del mando. Devuelve la respuesta (o null) */
  recibir(linea: string): string | null {
    const o = leerOrden(linea);
    if (!o) return null;
    this.sinMensajes = 0;
    if (o.tipo === "mover" && this.modo === "manual") {
      this.izq = o.izq;
      this.der = o.der;
    }
    if (o.tipo === "parar") {
      this.izq = 0;
      this.der = 0;
    }
    if (o.tipo === "modo") {
      this.modo = o.modo;
      this.izq = 0;
      this.der = 0;
      this.girando = 0;
      return `O ${o.modo}`;
    }
    return null;
  }

  /** Avanza el tiempo (segundos) */
  avanzar(dt: number) {
    this.sinMensajes += dt * 1000;
    if (this.sinMensajes > MS_SIN_MENSAJES) {
      this.izq = 0;
      this.der = 0;
    } else if (this.modo === "linea") {
      this.seguirLinea();
    } else if (this.modo === "obstaculos") {
      this.esquivar(dt);
    }

    const vi = (this.izq / 100) * VELOCIDAD_MAX;
    const vd = (this.der / 100) * VELOCIDAD_MAX;
    const avance = (vi + vd) / 2;
    // y va hacia abajo: si la rueda izquierda va más rápido, gira a la derecha (ángulo crece)
    this.angulo += ((vi - vd) / ENTRE_RUEDAS) * dt;
    const nx = this.x + Math.cos(this.angulo) * avance * dt;
    const ny = this.y + Math.sin(this.angulo) * avance * dt;
    this.chocado = choca(nx, ny);
    if (!this.chocado) {
      this.x = nx;
      this.y = ny;
    }
  }

  /** Lo que mide el sensor de delante, en cm (null = nada a la vista) */
  distancia(): number | null {
    const dx = Math.cos(this.angulo);
    const dy = Math.sin(this.angulo);
    for (let d = 0; d <= ALCANCE; d += 1) {
      const px = this.x + dx * (RADIO_COCHE + d);
      const py = this.y + dy * (RADIO_COCHE + d);
      if (dentroDeAlgo(px, py, 0)) return d;
    }
    return null;
  }

  /** Como los dos sensores de línea, pero mirando un poco por delante hacia el circuito */
  private seguirLinea() {
    const { px, py, tx, ty } = puntoDeLaLinea(this.x, this.y);
    const hx = Math.cos(this.angulo);
    const hy = Math.sin(this.angulo);
    // Recorre la línea en el sentido hacia donde ya mira el coche
    const signo = tx * hx + ty * hy >= 0 ? 1 : -1;
    const objX = px + tx * signo * 25 - this.x;
    const objY = py + ty * signo * 25 - this.y;
    let error = Math.atan2(objY, objX) - this.angulo;
    error = Math.atan2(Math.sin(error), Math.cos(error));
    const giro = Math.max(-1, Math.min(1, error * 1.5));
    this.izq = Math.round(45 * (1 + giro));
    this.der = Math.round(45 * (1 - giro));
  }

  /** Recto hasta ver algo cerca; entonces gira un rato a la derecha */
  private esquivar(dt: number) {
    if (this.girando > 0) {
      this.girando -= dt;
      this.izq = 55;
      this.der = -55;
      return;
    }
    const cm = this.distancia();
    // También si roza algo de lado (el sensor solo mira hacia delante)
    if (this.chocado || (cm !== null && cm < 25)) {
      this.girando = 0.6;
      return;
    }
    this.izq = 55;
    this.der = 55;
  }
}

/** ¿Este punto (con un margen) está dentro de una pared o de una caja? */
function dentroDeAlgo(x: number, y: number, margen: number): boolean {
  if (
    x < margen ||
    y < margen ||
    x > PISTA.ancho - margen ||
    y > PISTA.alto - margen
  )
    return true;
  return CAJAS.some(
    (c) =>
      x > c.x - margen &&
      x < c.x + c.ancho + margen &&
      y > c.y - margen &&
      y < c.y + c.alto + margen,
  );
}

const choca = (x: number, y: number) => dentroDeAlgo(x, y, RADIO_COCHE);

/** El punto de la línea más cercano y hacia dónde va la línea allí (dirección unitaria) */
export function puntoDeLaLinea(
  x: number,
  y: number,
): { px: number; py: number; tx: number; ty: number } {
  const { cx, cy, recta, radio } = LINEA;
  if (Math.abs(x - cx) <= recta) {
    return y < cy
      ? { px: x, py: cy - radio, tx: -1, ty: 0 }
      : { px: x, py: cy + radio, tx: 1, ty: 0 };
  }
  const centro = x > cx ? cx + recta : cx - recta;
  const a = Math.atan2(y - cy, x - centro);
  return {
    px: centro + radio * Math.cos(a),
    py: cy + radio * Math.sin(a),
    tx: Math.sin(a),
    ty: -Math.cos(a),
  };
}
