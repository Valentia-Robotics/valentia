import type { ReactNode } from "react";
import { Truck } from "lucide-react";
import { tienda } from "@/config/tienda";
import { calcularTotales } from "@/lib/precios";
import { formatearPrecio, plural } from "@/lib/utils";

interface Props {
  /** Suma de los productos (IVA incluido) */
  subtotalCentimos: number;
  totalArticulos: number;
  /** Botones o textos que van debajo del total */
  children?: ReactNode;
}

/**
 * Caja con el subtotal, el envío, el total y el IVA desglosado. Se usa en el carrito y en el checkout.
 * Los números salen de calcularTotales (src/lib/precios.ts), la misma función que usa el servidor.
 */
export function ResumenCompra({ subtotalCentimos, totalArticulos, children }: Props) {
  const t = calcularTotales(subtotalCentimos);

  return (
    <div className="rounded-tarjeta bg-niebla p-6">
      <h2 className="text-xl font-medium">Resumen</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-gris">
            Productos ({plural(totalArticulos, "artículo", "artículos")})
          </dt>
          <dd className="tabular-nums">{formatearPrecio(t.subtotalCentimos)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gris">Envío ({tienda.envio.nombreZona})</dt>
          {t.envioCentimos === 0 ? (
            <dd className="text-exito">Gratis</dd>
          ) : (
            <dd className="tabular-nums">{formatearPrecio(t.envioCentimos)}</dd>
          )}
        </div>
        <div className="flex items-baseline justify-between border-t border-linea pt-3">
          <dt className="font-medium">Total</dt>
          <dd className="font-titulo text-3xl font-medium tabular-nums">
            {formatearPrecio(t.totalCentimos)}
          </dd>
        </div>
        <div className="flex justify-between text-xs text-gris">
          <dt>Base imponible</dt>
          <dd className="tabular-nums">{formatearPrecio(t.baseImponibleCentimos)}</dd>
        </div>
        <div className="flex justify-between text-xs text-gris">
          <dt>IVA incluido ({tienda.ivaPorcentaje} %)</dt>
          <dd className="tabular-nums">{formatearPrecio(t.ivaCentimos)}</dd>
        </div>
      </dl>

      {t.faltaEnvioGratisCentimos > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-control bg-white p-3 text-sm">
          <Truck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-acento" />
          <span>
            Te faltan <strong>{formatearPrecio(t.faltaEnvioGratisCentimos)}</strong> para el envío
            gratis.
          </span>
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
