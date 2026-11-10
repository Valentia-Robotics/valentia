import Image from "next/image";
import { cn } from "@/lib/utils";

/** La foto de perfil, recortada en círculo (el tamaño lo pone quien la usa con className) */
export function FotoPerfil({ foto, className }: { foto: string; className?: string }) {
  return (
    <Image
      src={foto}
      alt=""
      width={96}
      height={96}
      unoptimized
      className={cn("rounded-full object-cover", className)}
    />
  );
}
