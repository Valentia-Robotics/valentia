/**
 * SIMULACIÓN: el mando habla con un coche de mentira que vive dentro del móvil (cocheSimulado.ts).
 * Sirve para probar el mando en Expo Go sin coche, sin wifi y sin Bluetooth.
 */
import { CocheSimulado } from "./cocheSimulado";
import type { Avisos, Conexion } from "./conexion";
import { leerMensaje } from "./protocolo";

/** Cada cuánto se mueve el coche (ms) y cada cuánto manda la distancia, como el de verdad */
const MS_PASO = 30;
const MS_DISTANCIA = 200;

export function conectarSimulado(
  avisos: Avisos,
): Conexion & { coche: CocheSimulado } {
  const coche = new CocheSimulado();
  let cerrada = false;
  const responder = (linea: string) => {
    const mensaje = leerMensaje(linea);
    if (mensaje && !cerrada) avisos.alRecibir(mensaje);
  };

  avisos.alCambiarEstado("conectando");
  const arranque = setTimeout(() => {
    avisos.alCambiarEstado("conectado", "Coche simulado");
    responder("H Coche-simulado 1.0");
  }, 400);

  let antes = Date.now();
  let desdeDistancia = 0;
  const reloj = setInterval(() => {
    const ahora = Date.now();
    const dt = Math.min(0.1, (ahora - antes) / 1000);
    antes = ahora;
    coche.avanzar(dt);
    desdeDistancia += dt * 1000;
    if (desdeDistancia >= MS_DISTANCIA) {
      desdeDistancia = 0;
      responder(`D ${coche.distancia() ?? -1}`);
    }
  }, MS_PASO);

  return {
    via: "simulacion",
    coche,
    enviar: (linea) => {
      const respuesta = coche.recibir(linea);
      if (respuesta) responder(respuesta);
    },
    cerrar: () => {
      cerrada = true;
      clearTimeout(arranque);
      clearInterval(reloj);
      avisos.alCambiarEstado("desconectado");
    },
  };
}
