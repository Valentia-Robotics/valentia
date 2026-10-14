/**
 * Categorías de componentes, con su nombre visible y su icono.
 * Se usan en la portada, en las fichas y (en la fase 3) en el configurador.
 */
import { BatteryCharging, Car, Cog, Cpu, Puzzle, Radar, type LucideIcon } from "lucide-react";
import type { Categoria } from "@/generated/prisma/enums";

export const categorias: { id: Categoria; nombre: string; icono: LucideIcon }[] = [
  { id: "PLACAS", nombre: "Placas", icono: Cpu },
  { id: "MOTORES", nombre: "Motores", icono: Cog },
  { id: "SENSORES", nombre: "Sensores", icono: Radar },
  { id: "ALIMENTACION", nombre: "Alimentación", icono: BatteryCharging },
  { id: "CHASIS", nombre: "Chasis y ruedas", icono: Car },
  { id: "EXTRAS", nombre: "Extras", icono: Puzzle },
];

export function nombreCategoria(id: Categoria): string {
  return categorias.find((c) => c.id === id)?.nombre ?? id;
}
