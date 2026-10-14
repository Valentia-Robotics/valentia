import type { Metadata } from "next";
import { VistaCarrito } from "@/components/compra/VistaCarrito";
import { Contenedor } from "@/components/ui/Contenedor";

export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false },
};

/** CARRITO. Los artículos se guardan en el navegador, así que la lista se pinta allí (VistaCarrito). */
export default function PaginaCarrito() {
  return (
    <Contenedor className="py-12 sm:py-16">
      <h1 className="text-4xl font-medium sm:text-5xl">Tu carrito.</h1>
      <VistaCarrito />
    </Contenedor>
  );
}
