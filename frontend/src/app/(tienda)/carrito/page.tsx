import type { Metadata } from "next";
import { VistaCarrito } from "@/components/compra/VistaCarrito";
import { CabeceraPagina } from "@/components/ui/CabeceraPagina";
import { Contenedor } from "@/components/ui/Contenedor";

export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false },
};

/** CARRITO. Los artículos se guardan en el navegador, así que la lista se pinta allí (VistaCarrito). */
export default function PaginaCarrito() {
  return (
    <>
      <CabeceraPagina compacta etiqueta="Compra" titulo="Tu carrito." />
      <Contenedor className="py-12 sm:py-16">
        <VistaCarrito />
      </Contenedor>
    </>
  );
}
