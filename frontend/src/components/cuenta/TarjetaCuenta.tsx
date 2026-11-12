import type { ReactNode } from "react";
import { Logo } from "@/components/marca/Logo";

interface Props {
  titulo: string;
  subtitulo?: ReactNode;
  children: ReactNode;
}

/** Tarjeta centrada con el logo: la usan /login, /registro, /verificar y /recuperar */
export function TarjetaCuenta({ titulo, subtitulo, children }: Props) {
  return (
    // Sobre el papel del estudio (como las cabeceras de la web); la tarjeta, blanca con sombra suave
    <div className="flex justify-center bg-estudio px-4 py-12 sm:py-20">
      <div className="llegar w-full max-w-md rounded-tarjeta bg-white p-6 shadow-posada sm:p-10">
        <Logo alto={14} />
        <h1 className="titular-cartel mt-8 text-4xl font-medium">{titulo}</h1>
        {subtitulo && <p className="mt-2 text-gris">{subtitulo}</p>}
        {children}
      </div>
    </div>
  );
}
