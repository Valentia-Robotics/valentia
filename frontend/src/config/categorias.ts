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
    descripcion: "Empieza por aquí: es donde va el programa y donde se conecta todo lo demás.",
  },
  {
    id: "MOTORES",
    nombre: "Motores",
    icono: Cog,
    descripcion: "Mueven las ruedas, los brazos y las pinzas.",
  },
  {
    id: "SENSORES",
    nombre: "Sensores",
    icono: Radar,
    descripcion:
      "Para que el robot note lo que pasa a su alrededor: obstáculos, líneas en el suelo o el tiempo que hace.",
  },
  {
    id: "ALIMENTACION",
    nombre: "Alimentación",
    icono: BatteryCharging,
    descripcion:
      "Baterías y portabaterías. Hacen falta si el robot lleva motores o va a moverse sin cables.",
  },
  {
    id: "CHASIS",
    nombre: "Chasis y ruedas",
    icono: Car,
    descripcion: "La estructura del robot, donde se sujeta todo lo demás.",
  },
  {
    id: "EXTRAS",
    nombre: "Extras",
    icono: Puzzle,
    descripcion: "Cables, pantallas y piezas que hacen sonar al robot.",
  },
];

export function nombreCategoria(id: Categoria): string {
  return categorias.find((c) => c.id === id)?.nombre ?? id;
}
