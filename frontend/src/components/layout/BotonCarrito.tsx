"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { enSeccion } from "@/config/marca";
import { cn } from "@/lib/utils";
import { seleccionarTotalArticulos, useCarrito, useCarritoHidratado } from "@/store/carrito";

/** Icono del carrito con el número de artículos. Lleva a /carrito. */
export function BotonCarrito() {
  const ruta = usePathname();
  const hidratado = useCarritoHidratado();
  const total = useCarrito(seleccionarTotalArticulos);
  const cantidad = hidratado ? total : 0;

  const etiqueta =
    cantidad === 0
      ? "Carrito, vacío"
      : `Carrito, ${cantidad} ${cantidad === 1 ? "artículo" : "artículos"}`;

  // En el carrito y en el checkout, el icono se marca como sección actual
  const activo = enSeccion(ruta, { href: "/carrito", tambien: ["/checkout"] });

  return (
    <Link
      href="/carrito"
      aria-label={etiqueta}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "relative inline-flex size-10 items-center justify-center border border-transparent transition-colors duration-100 hover:border-linea hover:bg-panel-alto hover:text-tinta",
        activo ? "border-linea text-acento" : "text-tinta/80",
      )}
    >
      <ShoppingBag aria-hidden="true" className="size-[18px]" strokeWidth={1.6} />
      {cantidad > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center bg-acento px-1 font-mono text-[10px] leading-none font-medium text-carbon"
        >
          {cantidad > 99 ? "99+" : cantidad}
        </span>
      )}
    </Link>
  );
}
