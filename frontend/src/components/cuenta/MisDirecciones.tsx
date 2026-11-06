"use client";

import { MapPin, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarDireccion } from "@/app/(cuenta)/cuenta/acciones";

export interface DireccionVista {
  id: string;
  nombre: string;
  lineas: string;
}

/** Direcciones guardadas en la cuenta (se guardan desde el checkout) con botón para borrarlas */
export function MisDirecciones({ direcciones }: { direcciones: DireccionVista[] }) {
  const [borrando, iniciar] = useTransition();

  if (direcciones.length === 0) {
    return (
      <p className="rounded-tarjeta bg-niebla p-5 text-sm text-gris">
        Aún no tienes direcciones guardadas. Al hacer un pedido, marca «Guardar esta dirección en mi
        cuenta» y la tendrás lista para la próxima vez.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-linea rounded-tarjeta ring-1 ring-linea">
      {direcciones.map((d) => (
        <li key={d.id} className="flex items-start gap-3 p-4">
          <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-gris" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">{d.nombre}</p>
            <p className="text-gris">{d.lineas}</p>
          </div>
          <button
            type="button"
            disabled={borrando}
            onClick={() => iniciar(async () => void (await eliminarDireccion(d.id)))}
            aria-label={`Borrar la dirección de ${d.nombre}: ${d.lineas}`}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-gris hover:bg-error/10 hover:text-error disabled:opacity-50"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
