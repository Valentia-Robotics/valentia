import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { ListaPedidos } from "@/components/cuenta/ListaPedidos";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { pedidosDeUsuario } from "@/lib/pedidos";
import { CabeceraPagina } from "@/components/ui/CabeceraPagina";
import { exigirUsuario } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis pedidos", robots: { index: false } };

/** MIS PEDIDOS: historial completo con el estado de cada uno */
export default async function PaginaMisPedidos() {
  const usuario = await exigirUsuario("/cuenta/pedidos");
  const pedidos = await pedidosDeUsuario(usuario);

  return (
    <>
      <CabeceraPagina
        compacta
        etiqueta="Mi cuenta"
        titulo="Mis pedidos."
        entradilla="Toca un pedido para ver su resumen, el seguimiento y las tarjetas de activación."
      />
      <Contenedor className="max-w-3xl py-12 sm:py-16">
        <Boton href="/cuenta" variante="enlace" className="h-auto text-sm">
          <ChevronLeft aria-hidden="true" className="size-4" />
          Mi cuenta
        </Boton>

        <div className="mt-8">
          <ListaPedidos pedidos={pedidos} />
        </div>
      </Contenedor>
    </>
  );
}
