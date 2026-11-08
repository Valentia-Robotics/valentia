/**
 * PROTOCOLO DEL MANDO (el mismo por wifi y por Bluetooth)
 * Mensajes de texto cortos, uno por línea. El programa del coche (firmware/coche-esp32) habla igual.
 *
 *   App → coche
 *     M <izq> <der>   velocidad de cada rueda, de -100 (atrás) a 100 (adelante). Se repite cada 150 ms:
 *                     si el coche deja de recibirlo medio segundo, se para solo.
 *     P               parar ya
 *     O <modo>        modo: manual | linea (sigue la línea) | obstaculos (esquiva obstáculos)
 *     L               «sigo aquí»: en los modos automáticos se manda en lugar de M (si deja de llegar, se para)
 *
 *   Coche → app
 *     H <nombre> <versión>   saludo al conectar
 *     D <cm>                 distancia que mide el sensor de ultrasonidos (-1 = nada delante)
 *     O <modo>               modo en el que está
 *
 * Este archivo no usa nada del móvil: se prueba con `npm test`.
 */

export type Modo = "manual" | "linea" | "obstaculos";
export const MODOS: Modo[] = ["manual", "linea", "obstaculos"];

/** Wifi: el coche crea su propia red («Valentia-Coche-XXXX») y escucha aquí */
export const WIFI = {
  direccion: "ws://192.168.4.1:81/",
  prefijoRed: "Valentia-Coche",
  contrasena: "valentia",
} as const;

/** Bluetooth: servicio «UART» de Nordic (el estándar para mandar texto por Bluetooth de bajo consumo) */
export const BLE = {
  prefijoNombre: "Valentia-Coche",
  servicio: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  /** La app escribe aquí */
  rx: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  /** El coche avisa por aquí */
  tx: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
} as const;

const limitar = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * Del joystick (x a la derecha, y hacia delante, de -1 a 1) a la velocidad de cada rueda.
 * Coche de dos ruedas: para girar, una rueda va más rápido que la otra.
 *   velocidad → tope de 0 a 100 (la barra de velocidad del mando)
 */
export function mezclar(
  x: number,
  y: number,
  velocidad: number,
): { izq: number; der: number } {
  const giro = limitar(x, -1, 1);
  const avance = limitar(y, -1, 1);
  let izq = avance + giro;
  let der = avance - giro;
  // Si una rueda se pasa de 1, se reducen las dos por igual (así se mantiene la curva)
  const mayor = Math.max(1, Math.abs(izq), Math.abs(der));
  izq /= mayor;
  der /= mayor;
  const tope = limitar(velocidad, 0, 100);
  return { izq: Math.round(izq * tope), der: Math.round(der * tope) };
}

export const orden = {
  mover: (izq: number, der: number) =>
    `M ${Math.round(limitar(izq, -100, 100))} ${Math.round(limitar(der, -100, 100))}`,
  parar: () => "P",
  latido: () => "L",
  modo: (modo: Modo) => `O ${modo}`,
};

export type MensajeCoche =
  | { tipo: "hola"; nombre: string; version: string }
  | { tipo: "distancia"; cm: number | null }
  | { tipo: "modo"; modo: Modo };

/** Lee una línea que manda el coche (o null si no se entiende) */
export function leerMensaje(linea: string): MensajeCoche | null {
  const [clave, ...resto] = linea.trim().split(/\s+/);
  if (clave === "H" && resto.length >= 1) {
    return { tipo: "hola", nombre: resto[0], version: resto[1] ?? "" };
  }
  if (clave === "D" && resto.length === 1) {
    const cm = Number(resto[0]);
    if (!Number.isFinite(cm)) return null;
    return { tipo: "distancia", cm: cm < 0 ? null : Math.round(cm) };
  }
  if (clave === "O" && MODOS.includes(resto[0] as Modo)) {
    return { tipo: "modo", modo: resto[0] as Modo };
  }
  return null;
}

/** Corta el texto recibido en líneas completas y devuelve lo que queda a medias */
export function partirLineas(
  pendiente: string,
  nuevo: string,
): { lineas: string[]; resto: string } {
  const todo = pendiente + nuevo;
  const partes = todo.split("\n");
  const resto = partes.pop() ?? "";
  return {
    lineas: partes.filter((l) => l.trim() !== ""),
    resto: resto.slice(-200),
  };
}

export type OrdenMando =
  | { tipo: "mover"; izq: number; der: number }
  | { tipo: "parar" }
  | { tipo: "latido" }
  | { tipo: "modo"; modo: Modo };

/** Lee una orden del mando (lo que hace el coche al recibirla; lo usa el coche simulado) */
export function leerOrden(linea: string): OrdenMando | null {
  const [clave, ...resto] = linea.trim().split(/\s+/);
  if (clave === "M" && resto.length === 2) {
    const izq = Number(resto[0]);
    const der = Number(resto[1]);
    if (!Number.isFinite(izq) || !Number.isFinite(der)) return null;
    return {
      tipo: "mover",
      izq: limitar(izq, -100, 100),
      der: limitar(der, -100, 100),
    };
  }
  if (clave === "P") return { tipo: "parar" };
  if (clave === "L") return { tipo: "latido" };
  if (clave === "O" && MODOS.includes(resto[0] as Modo)) {
    return { tipo: "modo", modo: resto[0] as Modo };
  }
  return null;
}
