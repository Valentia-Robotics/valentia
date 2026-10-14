import type { ReactNode } from "react";
import { formatearPrecio, plural } from "@/lib/utils";

interface Props {
  totalCentimos: number;
  totalArticulos: number;
  /** Botones o textos que van debajo del total */
  children?: ReactNode;
}

/** Caja con el subtotal, el envío y el total. Se usa en el carrito y en el checkout. */
export function ResumenCompra({ totalCentimos, totalArticulos, children }: Props) {
  return (
    <div className="rounded-tarjeta bg-niebla p-6">
      <h2 className="text-xl font-medium">Resumen</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-gris">
            Productos ({plural(totalArticulos, "artículo", "artículos")})
          </dt>
          <dd className="tabular-nums">{formatearPrecio(totalCentimos)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gris">Envío</dt>
          <dd className="text-exito">Gratis</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-linea pt-3">
          <dt className="font-medium">Total</dt>
          <dd className="font-titulo text-3xl font-medium tabular-nums">
            {formatearPrecio(totalCentimos)}
          </dd>
        </div>
      </dl>
      <p className="mt-1 text-right text-xs text-gris">IVA incluido</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
