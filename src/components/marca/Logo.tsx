import Image from "next/image";
import { marca } from "@/config/marca";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "claro" = para fondos claros (letras negras). "oscuro" = para fondos oscuros (letras blancas). */
  fondo?: "claro" | "oscuro";
  /** Altura de las letras en píxeles. Por debajo de 14 px los trazos finos se ven borrosos. */
  alto?: number;
  className?: string;
  /** true si el logo está en la parte de arriba de la página (carga antes) */
  prioridad?: boolean;
}

/** Logotipo de Valentia. Siempre usa este componente en vez de poner la imagen a mano. */
export function Logo({ fondo = "claro", alto = 16, className, prioridad = false }: LogoProps) {
  const ancho = Math.round((alto * marca.logo.ancho) / marca.logo.alto);

  return (
    <Image
      src={fondo === "claro" ? marca.logo.claro : marca.logo.oscuro}
      alt={marca.nombre}
      width={ancho}
      height={alto}
      priority={prioridad}
      // Los SVG no necesitan que Next.js los optimice
      unoptimized
      className={cn("block h-auto select-none", className)}
      style={{ width: ancho, maxWidth: "100%" }}
    />
  );
}
