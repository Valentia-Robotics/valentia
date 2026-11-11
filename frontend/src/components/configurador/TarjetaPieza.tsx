"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { TARJETA_TIENDA } from "@/components/ui/tarjeta";
import { cn, formatearPrecio } from "@/lib/utils";
import type { ComponenteCatalogo } from "@/types/catalogo";
import { maximoDe } from "./useRobot";
import { textoTienda } from "@/config/stock";

interface Props {
  componente: ComponenteCatalogo;
  /** Unidades que ya hay en el robot */
  enRobot: number;
  alAnadir: () => void;
  alVerDetalle: () => void;
}

/**
 * Tarjeta grande de una pieza, estilo quiosco: foto, nombre, precio y botón "Añadir".
 * Al pulsar en cualquier otra parte de la tarjeta se abre el detalle.
 */
export function TarjetaPieza({ componente, enRobot, alAnadir, alVerDetalle }: Props) {
  const agotado = componente.stock === 0;
  const sinMas = !agotado && enRobot >= maximoDe(componente);

  return (
    <article className={cn("group relative flex flex-col overflow-hidden", TARJETA_TIENDA)}>
      {enRobot > 0 && (
        <span className="absolute top-3 left-3 z-10 rounded-boton bg-acento px-2.5 py-1 text-xs font-semibold text-white">
          {enRobot} en tu robot
        </span>
      )}

      <div className="bg-niebla p-4">
        <Image
          src={componente.imagen}
          alt={componente.nombre}
          width={240}
          height={240}
          unoptimized
          className="mx-auto aspect-square h-auto w-full max-w-44 transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-sans text-base leading-snug font-medium">
          {/* Este botón "se estira" para que toda la tarjeta abra el detalle */}
          <button
            type="button"
            onClick={alVerDetalle}
            className="text-left after:absolute after:inset-0"
          >
            {componente.nombre}
            <span className="sr-only">, ver detalles</span>
          </button>
        </h3>
        <p className="mt-1 hidden flex-1 text-sm text-gris sm:block">{componente.resumen}</p>
        <p className="mt-3 text-lg font-medium">{formatearPrecio(componente.precioCentimos)}</p>

        {/* "relative z-10" pone el botón por encima de la zona que abre el detalle */}
        <Boton
          variante="acento"
          tamano="lg"
          onClick={alAnadir}
          disabled={agotado || sinMas}
          aria-label={`Añadir ${componente.nombre} a tu robot`}
          className="relative z-10 mt-3 w-full"
        >
          {agotado ? (
            textoTienda(0, componente.enReposicion)
          ) : sinMas ? (
            "No hay más"
          ) : (
            <>
              <Plus aria-hidden="true" className="size-5" />
              Añadir
            </>
          )}
        </Boton>
      </div>
    </article>
  );
}
