"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { seleccionarTotalArticulos, useCarrito, useCarritoHidratado } from "@/store/carrito";

/** Icono del carrito con el número de artículos. Lleva a /carrito. */
export function BotonCarrito() {
  const hidratado = useCarritoHidratado();
  const total = useCarrito(seleccionarTotalArticulos);
  const cantidad = hidratado ? total : 0;

  const etiqueta =
    cantidad === 0
      ? "Carrito, vacío"
      : `Carrito, ${cantidad} ${cantidad === 1 ? "artículo" : "artículos"}`;

  return (
    <Link
      href="/carrito"
      aria-label={etiqueta}
      className="relative inline-flex size-10 items-center justify-center rounded-full text-tinta/80 transition-colors hover:bg-tinta/5 hover:text-tinta"
    >
      <ShoppingBag aria-hidden="true" className="size-[18px]" strokeWidth={1.6} />
      {cantidad > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-acento px-1 text-[10px] leading-none font-semibold text-white"
        >
          {cantidad > 99 ? "99+" : cantidad}
        </span>
      )}
    </Link>
  );
}
