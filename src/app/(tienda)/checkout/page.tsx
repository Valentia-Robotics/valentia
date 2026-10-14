import type { Metadata } from "next";
import { FormularioCheckout } from "@/components/compra/FormularioCheckout";
import { Contenedor } from "@/components/ui/Contenedor";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false },
};

/** CHECKOUT: datos de envío y pago (simulado). La lógica está en acciones.ts. */
export default function PaginaCheckout() {
  return (
    <Contenedor className="py-12 sm:py-16">
      <h1 className="text-4xl font-medium sm:text-5xl">Finalizar compra.</h1>
      <FormularioCheckout />
    </Contenedor>
  );
}
