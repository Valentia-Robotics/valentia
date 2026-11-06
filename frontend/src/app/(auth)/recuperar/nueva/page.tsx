import type { Metadata } from "next";
import { FormularioContrasenaNueva } from "@/components/cuenta/FormulariosRecuperar";
import { TarjetaCuenta } from "@/components/cuenta/TarjetaCuenta";
import { Boton } from "@/components/ui/Boton";
import { recuperacionConfirmada } from "@/lib/verificacion/codigos";

export const metadata: Metadata = { title: "Elige tu contraseña nueva", robots: { index: false } };

/**
 * ¿OLVIDASTE TU CONTRASEÑA? Paso 3: la contraseña nueva.
 * Solo se puede llegar aquí después de escribir bien el código en /verificar (en este navegador).
 */
export default async function PaginaContrasenaNueva() {
  const recuperacion = await recuperacionConfirmada();

  if (!recuperacion) {
    return (
      <TarjetaCuenta
        titulo="Vuelve a pedir el código."
        subtitulo="Para elegir una contraseña nueva, primero tienes que escribir el código que te enviamos por email. Puede que haya pasado demasiado tiempo."
      >
        <Boton href="/recuperar" variante="acento" tamano="lg" className="mt-8 w-full">
          Volver a empezar
        </Boton>
      </TarjetaCuenta>
    );
  }

  return (
    <TarjetaCuenta
      titulo="Elige tu contraseña nueva."
      subtitulo={
        <>
          Para la cuenta{" "}
          <strong className="font-medium wrap-anywhere text-tinta">{recuperacion.email}</strong>. Al
          guardarla, cerraremos la sesión en todos tus dispositivos y entrarás aquí.
        </>
      }
    >
      <FormularioContrasenaNueva />
    </TarjetaCuenta>
  );
}
