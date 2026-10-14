"use client";

import Image from "next/image";
import { QrCode } from "lucide-react";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { SelectorCantidad } from "@/components/ui/SelectorCantidad";
import { formatearPrecio } from "@/lib/utils";
import { useCarrito } from "@/store/carrito";
import type { ArticuloCarrito } from "@/types/carrito";

const nombreTipo = {
  kit: "Kit",
  componente: "Componente",
  configuracion: "Robot personalizado",
} as const;

/** Una fila del carrito: foto, nombre, cantidad (+/−) y precio. */
export function LineaCarrito({ articulo }: { articulo: ArticuloCarrito }) {
  const cambiarCantidad = useCarrito((estado) => estado.cambiarCantidad);
  const quitar = useCarrito((estado) => estado.quitar);

  return (
    <li className="flex gap-4 py-6 sm:gap-6">
      <div className="size-20 shrink-0 rounded-control bg-niebla p-2 sm:size-28">
        {articulo.imagen && (
          <Image
            src={articulo.imagen}
            alt=""
            width={112}
            height={112}
            unoptimized
            className="size-full object-contain"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs text-gris">{nombreTipo[articulo.tipo]}</p>
            <h2 className="font-sans text-lg font-medium">{articulo.nombre}</h2>
          </div>
          <p className="text-lg font-medium tabular-nums sm:text-right">
            {formatearPrecio(articulo.precioCentimos * articulo.cantidad)}
            {articulo.cantidad > 1 && (
              <span className="block text-xs font-normal text-gris">
                {formatearPrecio(articulo.precioCentimos)} cada uno
              </span>
            )}
          </p>
        </div>

        {articulo.tipo === "kit" && (
          <Etiqueta tono="acento" className="mt-2">
            <QrCode aria-hidden="true" className="size-3.5" />
            Incluye curso y código de activación
          </Etiqueta>
        )}

        {articulo.detalle && articulo.detalle.length > 0 && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-acento">
              Ver las {articulo.detalle.length} piezas
            </summary>
            <ul className="mt-2 space-y-0.5 text-gris">
              {articulo.detalle.map((linea) => (
                <li key={linea}>{linea}</li>
              ))}
            </ul>
          </details>
        )}

        <div className="mt-4 flex items-center gap-4">
          <SelectorCantidad
            valor={articulo.cantidad}
            maximo={99}
            alCambiar={(n) => cambiarCantidad(articulo.id, n)}
            etiqueta={`Cantidad de ${articulo.nombre}`}
          />
          <button
            type="button"
            onClick={() => quitar(articulo.id)}
            className="text-sm text-gris underline-offset-4 hover:text-tinta hover:underline"
          >
            Quitar<span className="sr-only"> {articulo.nombre}</span>
          </button>
        </div>
      </div>
    </li>
  );
}
