import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { estadosPedido } from "@/config/estadosPedido";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { cn, formatearPrecio, plural } from "@/lib/utils";

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

const colores = {
  exito: "bg-exito/10 text-exito",
  aviso: "bg-aviso/10 text-aviso",
  error: "bg-error/10 text-error-oscuro",
  neutro: "bg-acento/10 text-acento",
} as const;

interface PedidoLista {
  id: string;
  numero: string;
  estado: EstadoPedido;
  totalCentimos: number;
  creadoEn: Date;
  _count: { lineas: number };
}

/** Lista de pedidos de «Mi cuenta», con su estado. Cada uno lleva a su página. */
export function ListaPedidos({ pedidos }: { pedidos: PedidoLista[] }) {
  if (pedidos.length === 0) {
    return (
      <div className="rounded-tarjeta bg-niebla p-6 text-center">
        <Package aria-hidden="true" className="mx-auto size-10 text-gris-claro" strokeWidth={1.3} />
        <p className="mt-3 font-medium">Aún no tienes pedidos</p>
        <p className="mt-1 text-sm text-gris">
          Cuando compres un kit, lo verás aquí con su estado.
        </p>
        <Boton href="/kits" variante="acento" className="mt-5">
          Ver los kits
        </Boton>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-linea rounded-tarjeta ring-1 ring-linea">
      {pedidos.map((p) => {
        const estado = estadosPedido[p.estado];
        return (
          <li key={p.id}>
            <Link
              href={`/pedido/${p.id}`}
              className="flex items-center gap-4 p-4 transition-colors hover:bg-niebla"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-medium">{p.numero}</p>
                <p className="text-sm text-gris">
                  {formatoFecha.format(p.creadoEn)} ·{" "}
                  {plural(p._count.lineas, "artículo", "artículos")} ·{" "}
                  {formatearPrecio(p.totalCentimos)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                  colores[estado.tono],
                )}
              >
                {estado.nombre}
              </span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gris" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
