"use client";

import type { ReactNode } from "react";
import type { Modelo3D } from "@/config/modelos3d";
import { Visor3D } from "./Visor3D";

interface Props {
  modelo: Modelo3D | null | undefined;
  nombre: string;
  /** La foto de la pieza (lo de siempre) */
  foto: ReactNode;
  className?: string;
}

/**
 * La pieza en 3D si tiene modelo (src/config/modelos3d.ts); si no, o si el 3D no puede abrirse, su foto.
 * Así cada pieza pasa a 3D en cuanto Alonso sube su archivo.
 */
export function FotoOModelo({ modelo, nombre, foto, className }: Props) {
  if (!modelo) return <div className={className}>{foto}</div>;
  return <Visor3D modelo={modelo} nombre={nombre} alternativa={foto} className={className} />;
}
