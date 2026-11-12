import type { ReactNode } from "react";
import { CampoPixeles } from "@/components/portada/CampoPixeles";
import { Logo } from "@/components/marca/Logo";

interface Props {
  titulo: string;
  subtitulo?: ReactNode;
  children: ReactNode;
}

/** Tarjeta centrada con el logo: la usan /login, /registro, /verificar y /recuperar */
export function TarjetaCuenta({ titulo, subtitulo, children }: Props) {
  return (
    // Sobre la placa verde de las cabeceras; la tarjeta, recta con sombra cobre
    <div className="campo-placa relative isolate flex justify-center overflow-hidden px-4 py-12 sm:py-20">
      <CampoPixeles variante="cabecera" />
      <div className="relative w-full max-w-md rounded-tarjeta bg-white p-6 shadow-[8px_8px_0_var(--color-cobre)] ring-1 ring-tinta/15 sm:p-10">
        <Logo alto={14} />
        <h1 className="titular-cartel mt-8 text-4xl font-medium">{titulo}</h1>
        {subtitulo && <p className="mt-2 text-gris">{subtitulo}</p>}
        {children}
      </div>
    </div>
  );
}
