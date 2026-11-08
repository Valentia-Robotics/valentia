/**
 * CONEXIÓN CON EL COCHE: wifi o Bluetooth, las dos con la misma forma.
 * La pantalla del mando no sabe cuál se usa: solo envía órdenes y recibe mensajes.
 */
import type { MensajeCoche } from "./protocolo";

export type Via = "wifi" | "bluetooth" | "simulacion";

export type EstadoConexion =
  | "desconectado"
  | "buscando"
  | "conectando"
  | "conectado"
  | "error";

export interface Conexion {
  via: Via;
  /** Envía una línea al coche (sin el salto de línea final) */
  enviar: (linea: string) => void;
  cerrar: () => void;
}

export interface Avisos {
  alCambiarEstado: (estado: EstadoConexion, detalle?: string) => void;
  alRecibir: (mensaje: MensajeCoche) => void;
}
