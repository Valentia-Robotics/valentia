/**
 * WIFI: el coche crea su propia red («Valentia-Coche-XXXX», contraseña «valentia»).
 * El móvil se conecta a esa red desde los ajustes y la app habla con el coche por WebSocket.
 * Funciona también en Expo Go (no necesita nada especial del móvil).
 */
import type { Avisos, Conexion } from "./conexion";
import { leerMensaje, partirLineas, WIFI } from "./protocolo";

/** Segundos esperando a que el coche conteste antes de rendirse */
const ESPERA_MAXIMA = 6;

/** Para probar sin coche se puede cambiar con EXPO_PUBLIC_COCHE_WS (por ejemplo, un simulador en el ordenador) */
const DIRECCION = process.env.EXPO_PUBLIC_COCHE_WS || WIFI.direccion;

export function conectarWifi(
  avisos: Avisos,
  direccion: string = DIRECCION,
): Conexion {
  let cerrada = false;
  let pendiente = "";
  avisos.alCambiarEstado("conectando");

  const socket = new WebSocket(direccion);
  const limite = setTimeout(() => {
    if (socket.readyState !== WebSocket.OPEN) {
      avisos.alCambiarEstado(
        "error",
        "No encontramos el coche. Comprueba que el móvil está conectado a la red wifi «Valentia-Coche».",
      );
      socket.close();
    }
  }, ESPERA_MAXIMA * 1000);

  socket.onopen = () => {
    clearTimeout(limite);
    avisos.alCambiarEstado("conectado");
  };
  socket.onmessage = (evento) => {
    if (typeof evento.data !== "string") return;
    const { lineas, resto } = partirLineas(
      pendiente,
      evento.data.endsWith("\n") ? evento.data : `${evento.data}\n`,
    );
    pendiente = resto;
    for (const linea of lineas) {
      const mensaje = leerMensaje(linea);
      if (mensaje) avisos.alRecibir(mensaje);
    }
  };
  socket.onclose = () => {
    clearTimeout(limite);
    if (!cerrada)
      avisos.alCambiarEstado(
        "desconectado",
        "Se ha perdido la conexión con el coche.",
      );
  };
  socket.onerror = () => {
    // onclose llega justo después: allí se avisa
  };

  return {
    via: "wifi",
    enviar: (linea) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(linea);
    },
    cerrar: () => {
      cerrada = true;
      clearTimeout(limite);
      socket.close();
      avisos.alCambiarEstado("desconectado");
    },
  };
}
