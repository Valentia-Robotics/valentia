"use client";

import Image from "next/image";
import { Link2, Plus } from "lucide-react";
import { useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { SelectorCantidad } from "@/components/ui/SelectorCantidad";
import { nombreCategoria } from "@/config/categorias";
import { requisitosDe } from "@/lib/compatibilidad";
import { fichaTecnica } from "@/lib/fichaTecnica";
import { formatearPrecio } from "@/lib/utils";
import type { ComponenteCatalogo } from "@/types/catalogo";
import { maximoDe } from "./useRobot";
import { textoTienda } from "@/config/stock";
import { Ver3dPieza } from "./Ver3dPieza";

interface Props {
  componente: ComponenteCatalogo;
  enRobot: number;
  alAnadir: (cantidad: number) => void;
}

/** Contenido de la ventana de detalle: foto, descripción, datos técnicos y cantidad. */
export function DetallePieza({ componente, enRobot, alAnadir }: Props) {
  // Lo que todavía se puede añadir sin pasarse del stock
  const disponibles = Math.max(maximoDe(componente) - enRobot, 0);
  const [cantidad, setCantidad] = useState(disponibles > 0 ? 1 : 0);
  const requisitos = requisitosDe(componente);

  return (
    <div className="grid gap-6 p-5 sm:grid-cols-[2fr_3fr] sm:p-6">
      <div className="relative self-start rounded-tarjeta bg-niebla p-6">
        <Ver3dPieza componente={componente} />
        <Image
          src={componente.imagen}
          alt={`Foto de ${componente.nombre}`}
          width={320}
          height={320}
          unoptimized
          className="render-vivo mx-auto aspect-square h-auto w-full max-w-64"
        />
      </div>

      <div>
        {/* El nombre ya aparece como título de la ventana */}
        <p className="text-sm text-gris">{nombreCategoria(componente.categoria)}</p>
        <p className="mt-1 text-2xl font-medium">{formatearPrecio(componente.precioCentimos)}</p>
        <p className="mt-4 leading-relaxed text-tinta/80">{componente.descripcion}</p>

        {requisitos.length > 0 && (
          <div className="mt-5 rounded-control bg-acento/5 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-acento">
              <Link2 aria-hidden="true" className="size-4" />
              Para que funcione necesita
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {requisitos.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <h3 className="mt-6 font-sans text-sm font-medium">Datos técnicos</h3>
        <dl className="mt-2 divide-y divide-linea text-sm">
          {fichaTecnica(componente).map((dato) => (
            <div key={dato.nombre} className="flex justify-between gap-4 py-2">
              <dt className="text-gris">{dato.nombre}</dt>
              <dd className="text-right">{dato.valor}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-sm text-gris">
          {componente.stock > 0
            ? `${componente.stock} unidades disponibles`
            : textoTienda(0, componente.enReposicion)}
          {enRobot > 0 && ` · ${enRobot} ya en tu robot`}
        </p>

        {/* Cantidad + botón de añadir */}
        <div className="sticky bottom-0 -mx-5 mt-4 flex flex-col gap-3 bg-white px-5 py-4 sm:static sm:mx-0 sm:flex-row sm:items-center sm:p-0">
          <SelectorCantidad
            valor={cantidad}
            alCambiar={setCantidad}
            minimo={disponibles > 0 ? 1 : 0}
            maximo={disponibles}
            etiqueta={`Cantidad de ${componente.nombre}`}
            tamano="lg"
            className="self-center sm:self-auto"
          />
          <Boton
            variante="acento"
            tamano="lg"
            disabled={cantidad === 0}
            onClick={() => alAnadir(cantidad)}
            className="w-full sm:flex-1"
          >
            <Plus aria-hidden="true" className="size-5" />
            {disponibles === 0
              ? "No hay más unidades"
              : `Añadir ${cantidad > 1 ? `${cantidad} ` : ""}· ${formatearPrecio(componente.precioCentimos * cantidad)}`}
          </Boton>
        </div>
      </div>
    </div>
  );
}
