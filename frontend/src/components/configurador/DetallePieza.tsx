"use client";

import Image from "next/image";
import { useState } from "react";
import { FotoOModelo } from "@/components/tienda/FotoOModelo";
import { Boton } from "@/components/ui/Boton";
import { SelectorCantidad } from "@/components/ui/SelectorCantidad";
import { TablaDatos } from "@/components/ui/TablaDatos";
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
      {/* Con modelo 3D (Alonso): se gira, se acerca y enseña sus medidas; sin él, la foto de siempre */}
      <FotoOModelo
        modelo={componente.modelo3d}
        nombre={componente.nombre}
        className="self-start"
        foto={
          <div className="rejilla-plano-fina relative border border-linea bg-panel p-6">
            <Ver3dPieza componente={componente} />
            <Image
              src={componente.imagen}
              alt={`Foto de ${componente.nombre}`}
              width={320}
              height={320}
              unoptimized
              className="mx-auto aspect-square h-auto w-full max-w-64"
            />
          </div>
        }
      />

      <div>
        {/* El nombre ya aparece como título de la ventana */}
        <p className="mono-etiqueta text-gris">
          {nombreCategoria(componente.categoria)} · {componente.slug}
        </p>
        <p className="mt-1 font-mono text-2xl text-tinta">{formatearPrecio(componente.precioCentimos)}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-gris">{componente.descripcion}</p>

        {requisitos.length > 0 && (
          <div className="mt-5 border border-linea p-4">
            <p className="mono-etiqueta text-acento">Dependencias</p>
            <ul className="mt-2 space-y-1 text-sm">
              {requisitos.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="font-mono text-gris-claro">→</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <h3 className="mono-etiqueta mt-6 text-gris">Especificaciones</h3>
        <TablaDatos filas={fichaTecnica(componente)} densa className="mt-2" />

        <p className="mt-4 font-mono text-[12px] text-gris">
          {componente.stock > 0
            ? `${componente.stock} uds. en almacén`
            : textoTienda(0, componente.enReposicion)}
          {enRobot > 0 && ` · ×${enRobot} en el banco`}
        </p>

        {/* Cantidad + botón de añadir */}
        <div className="sticky bottom-0 -mx-5 mt-4 flex flex-col gap-3 bg-carbon px-5 py-4 sm:static sm:mx-0 sm:flex-row sm:items-center sm:p-0">
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
            {disponibles === 0
              ? "Sin más unidades"
              : `+ Añadir ${cantidad > 1 ? `${cantidad} ` : ""}· ${formatearPrecio(componente.precioCentimos * cantidad)}`}
          </Boton>
        </div>
      </div>
    </div>
  );
}
