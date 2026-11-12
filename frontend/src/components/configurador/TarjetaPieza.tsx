"use client";

import Image from "next/image";
import { textoTienda } from "@/config/stock";
import { cn, formatearNumero, formatearPrecio } from "@/lib/utils";
import type { ComponenteCatalogo } from "@/types/catalogo";
import { maximoDe } from "./useRobot";
import { Ver3dPieza } from "./Ver3dPieza";

interface Props {
  componente: ComponenteCatalogo;
  /** Unidades que ya hay en el robot */
  enRobot: number;
  alAnadir: () => void;
  alVerDetalle: () => void;
}

/**
 * Pieza del banco de pruebas: referencia, foto sobre rejilla, los datos eléctricos que cuentan para la
 * compatibilidad (lógica, consumo, GPIO), precio y tecla «+ Añadir». Al pulsar en cualquier otra parte
 * de la tarjeta se abre el detalle.
 */
export function TarjetaPieza({ componente: c, enRobot, alAnadir, alVerDetalle }: Props) {
  const agotado = c.stock === 0;
  const sinMas = !agotado && enRobot >= maximoDe(c);
  const datos: [string, string][] = [
    [
      c.tipo === "bateria" ? "V" : "Lógica",
      c.voltajeLogico
        ? `${formatearNumero(c.voltajeLogico)} V`
        : c.voltaje
          ? `${formatearNumero(c.voltaje)} V`
          : "—",
    ],
    [c.tipo === "bateria" ? "I máx." : "mA", c.consumoMa ? formatearNumero(c.consumoMa) : "—"],
    [c.tipo === "placa" ? "GPIO" : "Pines", c.pines ? String(c.pines) : "—"],
  ];

  return (
    <article
      className={cn(
        "group relative flex w-full flex-col border bg-carbon transition-colors duration-150 hover:bg-panel",
        enRobot > 0 ? "border-acento" : "border-linea hover:border-borde-fuerte",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <span className="mono-etiqueta truncate text-[10px] text-gris-claro">{c.slug}</span>
        {enRobot > 0 && (
          <span className="mono-etiqueta shrink-0 bg-acento px-1.5 text-[10px] text-carbon">
            ×{enRobot}
          </span>
        )}
      </div>
      <div className="rejilla-plano-fina relative mx-3 mt-2 border border-linea bg-panel p-3">
        <Ver3dPieza componente={c} />
        <Image
          src={c.imagen}
          alt={c.nombre}
          width={240}
          height={240}
          unoptimized
          className="mx-auto aspect-square h-auto w-full max-w-36"
        />
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-[15px] leading-snug font-semibold">
          {/* Este botón "se estira" para que toda la tarjeta abra el detalle */}
          <button
            type="button"
            onClick={alVerDetalle}
            className="text-left after:absolute after:inset-0"
          >
            {c.nombre}
            <span className="sr-only">, ver detalles</span>
          </button>
        </h3>
        <dl className="mt-3 grid grid-cols-3 border-t border-l border-linea font-mono text-[11px]">
          {datos.map(([nombre, valor]) => (
            <div key={nombre} className="border-r border-b border-linea px-1.5 py-1">
              <dt className="text-[9px] tracking-[0.08em] text-gris uppercase">{nombre}</dt>
              <dd className="truncate text-tinta">{valor}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="font-mono text-[15px] text-tinta tabular-nums">
            {formatearPrecio(c.precioCentimos)}
          </span>
          {/* "relative z-10" pone la tecla por encima de la zona que abre el detalle */}
          <button
            type="button"
            onClick={alAnadir}
            disabled={agotado || sinMas}
            aria-label={`Añadir ${c.nombre} a tu robot`}
            className="tecla mono-etiqueta relative z-10 bg-acento px-3 py-2 text-carbon transition-colors duration-100 hover:bg-acento-hover disabled:bg-panel-alto disabled:text-gris disabled:shadow-none"
          >
            {agotado ? textoTienda(0, c.enReposicion) : sinMas ? "Máx." : "+ Añadir"}
          </button>
        </div>
      </div>
    </article>
  );
}
