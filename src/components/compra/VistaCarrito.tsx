"use client";

import { ShoppingBag } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import {
  seleccionarTotalArticulos,
  seleccionarTotalCentimos,
  useCarrito,
  useCarritoHidratado,
} from "@/store/carrito";
import { LineaCarrito } from "./LineaCarrito";
import { ResumenCompra } from "./ResumenCompra";

/** Contenido de /carrito: lista de artículos y resumen con el botón para tramitar el pedido. */
export function VistaCarrito() {
  const hidratado = useCarritoHidratado();
  const articulos = useCarrito((estado) => estado.articulos);
  const totalCentimos = useCarrito(seleccionarTotalCentimos);
  const totalArticulos = useCarrito(seleccionarTotalArticulos);

  if (!hidratado) {
    return <p className="mt-10 text-gris">Cargando tu carrito…</p>;
  }

  if (articulos.length === 0) {
    return (
      <div className="mt-10 rounded-tarjeta bg-niebla px-6 py-16 text-center">
        <ShoppingBag
          aria-hidden="true"
          className="mx-auto size-12 text-gris-claro"
          strokeWidth={1.2}
        />
        <p className="mt-4 text-xl font-medium">Tu carrito está vacío</p>
        <p className="mt-1 text-gris">Elige un kit para empezar o crea tu propio robot.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Boton href="/kits" variante="acento" tamano="lg">
            Ver los kits
          </Boton>
          <Boton href="/configurador" variante="secundario" tamano="lg">
            Crear mi robot
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
      <ul className="divide-y divide-linea border-y border-linea">
        {articulos.map((articulo) => (
          <LineaCarrito key={articulo.id} articulo={articulo} />
        ))}
      </ul>

      <div className="lg:sticky lg:top-[calc(var(--spacing-nav)+1.5rem)]">
        <ResumenCompra totalCentimos={totalCentimos} totalArticulos={totalArticulos}>
          <Boton href="/checkout" variante="acento" tamano="xl" className="w-full">
            Tramitar pedido
          </Boton>
          <Boton href="/kits" variante="enlace" className="mt-3 w-full">
            Seguir comprando ›
          </Boton>
        </ResumenCompra>
      </div>
    </div>
  );
}
