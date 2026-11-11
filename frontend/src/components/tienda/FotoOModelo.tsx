"use client";

import { Box, Image as IconoFoto } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { Modelo3D } from "@/config/modelos3d";
import { cn } from "@/lib/utils";
import { Visor3D } from "./Visor3D";

interface Props {
  modelo: Modelo3D | null | undefined;
  nombre: string;
  /** La foto de la pieza (lo de siempre) */
  foto: ReactNode;
  className?: string;
}

/**
 * Foto de una pieza con un selector «Foto · 3D» si tiene modelo 3D (src/config/modelos3d.ts).
 * Sin modelo, es solo la foto: así cada pieza pasa a 3D en cuanto Alonso sube su archivo.
 */
export function FotoOModelo({ modelo, nombre, foto, className }: Props) {
  const [en3d, setEn3d] = useState(true);
  if (!modelo) return <div className={className}>{foto}</div>;

  const pestana = (activa: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-medium transition-colors",
      activa ? "bg-tinta text-white" : "text-gris hover:text-tinta",
    );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {en3d ? <Visor3D modelo={modelo} nombre={nombre} alternativa={foto} /> : foto}
      <div className="flex justify-center gap-1" role="group" aria-label="Cómo ver la pieza">
        <button
          type="button"
          className={pestana(en3d)}
          aria-pressed={en3d}
          onClick={() => setEn3d(true)}
        >
          <Box aria-hidden="true" className="size-3.5" />
          3D
        </button>
        <button
          type="button"
          className={pestana(!en3d)}
          aria-pressed={!en3d}
          onClick={() => setEn3d(false)}
        >
          <IconoFoto aria-hidden="true" className="size-3.5" />
          Foto
        </button>
      </div>
    </div>
  );
}
