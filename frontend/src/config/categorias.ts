/**
 * Categorías de componentes, con su nombre visible, su icono y una frase de ayuda.
 * Se usan en la portada, en las fichas, en /componentes y en el configurador.
 */
import { BatteryCharging, Car, Cog, Cpu, Puzzle, Radar, type LucideIcon } from "lucide-react";
import type { Categoria } from "@/generated/prisma/enums";

export interface InfoCategoria {
  id: Categoria;
  nombre: string;
  icono: LucideIcon;
  /** Frase corta que explica para qué sirve la categoría */
  descripcion: string;
}

export const categorias: InfoCategoria[] = [
  {
    id: "PLACAS",
    nombre: "Placas",
    icono: Cpu,
    descripcion: "El cerebro de tu robot. Empieza por aquí: todo lo demás se conecta a la placa.",
  },
  {
    id: "MOTORES",
    nombre: "Motores",
    icono: Cog,
    descripcion: "Lo que hace que tu robot se mueva: ruedas, brazos y pinzas.",
  },
  {
    id: "SENSORES",
    nombre: "Sensores",
    icono: Radar,
    descripcion:
      "Los sentidos de tu robot: ver obstáculos, seguir líneas o medir el tiempo que hace.",
  },
  {
    id: "ALIMENTACION",
    nombre: "Alimentación",
    icono: BatteryCharging,
    descripcion: "La energía. Imprescindible si tu robot lleva motores o va a moverse sin cables.",
  },
  {
    id: "CHASIS",
    nombre: "Chasis y ruedas",
    icono: Car,
    descripcion: "El cuerpo de tu robot, donde se atornilla todo lo demás.",
  },
  {
    id: "EXTRAS",
    nombre: "Extras",
    icono: Puzzle,
    descripcion: "Cables, pantallas y sonidos para darle personalidad.",
  },
];

export function nombreCategoria(id: Categoria): string {
  return categorias.find((c) => c.id === id)?.nombre ?? id;
}
