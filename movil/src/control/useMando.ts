/**
 * El «cerebro» de la pantalla del mando: conexión, joystick, velocidad, modo y lo que manda el coche.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Conexion, EstadoConexion, Via } from "./conexion";
import type { CocheSimulado } from "./cocheSimulado";
import { conectarBluetooth } from "./conexionBluetooth";
import { conectarSimulado } from "./conexionSimulada";
import { conectarWifi } from "./conexionWifi";
import { mezclar, type Modo, orden } from "./protocolo";

/** Cada cuánto se manda la posición del joystick (también sirve de «sigo aquí» para el coche) */
const MS_ENTRE_ORDENES = 150;

export function useMando() {
  const [estado, setEstado] = useState<EstadoConexion>("desconectado");
  const [detalle, setDetalle] = useState<string | null>(null);
  const [via, setVia] = useState<Via | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [distancia, setDistancia] = useState<number | null>(null);
  const [modo, setModo] = useState<Modo>("manual");
  const [velocidad, setVelocidad] = useState(70);
  /** Solo en la simulación: el coche de mentira, para dibujarlo en la pantalla */
  const [simulado, setSimulado] = useState<CocheSimulado | null>(null);

  const conexion = useRef<Conexion | null>(null);
  const joystick = useRef({ x: 0, y: 0 });
  const velocidadRef = useRef(velocidad);
  const modoRef = useRef(modo);
  useEffect(() => {
    velocidadRef.current = velocidad;
    modoRef.current = modo;
  }, [velocidad, modo]);

  const desconectar = useCallback(() => {
    conexion.current?.enviar(orden.parar());
    conexion.current?.cerrar();
    conexion.current = null;
    setVia(null);
    setDistancia(null);
    setSimulado(null);
  }, []);

  const conectar = useCallback(
    (nueva: Via) => {
      desconectar();
      setDetalle(null);
      setVia(nueva);
      setModo("manual");
      const avisos = {
        alCambiarEstado: (e: EstadoConexion, d?: string) => {
          setEstado(e);
          if (e === "conectado" || e === "conectando") setNombre(d ?? null);
          if (e === "error" || e === "desconectado") {
            setDetalle(d ?? null);
            setDistancia(null);
          }
        },
        alRecibir: (
          m: Parameters<Parameters<typeof conectarWifi>[0]["alRecibir"]>[0],
        ) => {
          if (m.tipo === "distancia") setDistancia(m.cm);
          if (m.tipo === "modo") setModo(m.modo);
          if (m.tipo === "hola") setNombre(m.nombre);
        },
      };
      if (nueva === "simulacion") {
        const sim = conectarSimulado(avisos);
        setSimulado(sim.coche);
        conexion.current = sim;
      } else {
        conexion.current =
          nueva === "wifi" ? conectarWifi(avisos) : conectarBluetooth(avisos);
      }
    },
    [desconectar],
  );

  // Mientras está conectado mandamos el joystick cada 150 ms (en automático, solo «sigo aquí»)
  useEffect(() => {
    if (estado !== "conectado") return;
    const reloj = setInterval(() => {
      if (modoRef.current !== "manual") {
        conexion.current?.enviar(orden.latido());
        return;
      }
      const { izq, der } = mezclar(
        joystick.current.x,
        joystick.current.y,
        velocidadRef.current,
      );
      conexion.current?.enviar(orden.mover(izq, der));
    }, MS_ENTRE_ORDENES);
    return () => clearInterval(reloj);
  }, [estado]);

  // Al salir de la pantalla: parar el coche y cerrar
  useEffect(() => desconectar, [desconectar]);

  return {
    estado,
    detalle,
    via,
    nombre,
    distancia,
    simulado,
    modo,
    velocidad,
    conectar,
    desconectar,
    setVelocidad,
    moverJoystick: (x: number, y: number) => {
      joystick.current = { x, y };
    },
    cambiarModo: (nuevo: Modo) => {
      setModo(nuevo);
      conexion.current?.enviar(orden.modo(nuevo));
    },
    parar: () => {
      joystick.current = { x: 0, y: 0 };
      setModo("manual");
      conexion.current?.enviar(orden.modo("manual"));
      conexion.current?.enviar(orden.parar());
    },
  };
}
