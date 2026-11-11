/**
 * AVISOS DEL EQUIPO (en memoria, no se guarda): mensajes sin leer y alarmas de tareas.
 * Los rellena AvisosEquipo (que pregunta al servidor cada poco) y los leen el número del menú y las
 * tarjetas de alarma.
 */
import { create } from "zustand";
import type { Prioridad } from "@/config/mensajes";

export interface Alarma {
  id: string;
  ruta: string;
  texto: string;
  de: string;
  prioridad: Prioridad | null;
  entrega: string | null;
}

/** El último mensaje sin leer (para la tarjeta «Nuevo mensaje de…») */
export interface UltimoMensaje {
  id: string;
  de: string;
  texto: string;
  ruta: string;
}

interface Estado {
  total: number;
  alarmas: Alarma[];
  ultimo: UltimoMensaje | null;
  poner: (datos: { total: number; alarmas: Alarma[]; ultimo?: UltimoMensaje | null }) => void;
  quitarAlarma: (id: string) => void;
}

export const useAvisosEquipo = create<Estado>((set) => ({
  total: 0,
  alarmas: [],
  ultimo: null,
  poner: ({ total, alarmas, ultimo = null }) => set({ total, alarmas, ultimo }),
  quitarAlarma: (id) => set((e) => ({ alarmas: e.alarmas.filter((a) => a.id !== id) })),
}));
