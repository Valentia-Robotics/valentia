"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * La foto de perfil, recortada en círculo (el tamaño lo pone quien la usa con className).
 * Si la foto no carga (por ejemplo, una antigua que ya no está en el servidor), enseña
 * «alternativa» (las iniciales) en vez del icono de imagen rota.
 */
export function FotoPerfil({
  foto,
  className,
  alternativa = null,
}: {
  foto: string;
  className?: string;
  alternativa?: ReactNode;
}) {
  // Se guarda qué foto falló: si cambia la foto, se vuelve a intentar
  const [fallida, setFallida] = useState<string | null>(null);
  if (fallida === foto) return <>{alternativa}</>;
  return (
    <Image
      src={foto}
      alt=""
      width={96}
      height={96}
      unoptimized
      onError={() => setFallida(foto)}
      className={cn("rounded-full object-cover", className)}
    />
  );
}
