import type { Metadata } from "next";
import Link from "next/link";
import { FormularioPedirCodigo } from "@/components/cuenta/FormulariosRecuperar";
import { TarjetaCuenta } from "@/components/cuenta/TarjetaCuenta";

export const metadata: Metadata = { title: "¿Olvidaste tu contraseña?", robots: { index: false } };

/** ¿OLVIDASTE TU CONTRASEÑA? Paso 1: el email (paso 2: /verificar · paso 3: /recuperar/nueva) */
export default function PaginaRecuperar() {
  return (
    <TarjetaCuenta
      titulo="¿Olvidaste tu contraseña?"
      subtitulo="No pasa nada. Escribe el email de tu cuenta y te enviaremos un código para elegir una nueva."
    >
      <FormularioPedirCodigo />
      <p className="mt-5 text-center text-sm text-gris">
        ¿Te has acordado?{" "}
        <Link href="/login" className="text-acento underline underline-offset-4">
          Inicia sesión
        </Link>
      </p>
    </TarjetaCuenta>
  );
}
