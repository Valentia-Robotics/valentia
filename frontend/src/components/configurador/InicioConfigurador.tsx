"use client";

import Link from "next/link";
import Image from "next/image";
import { formatearPrecio } from "@/lib/utils";
import type { KitParaConfigurador } from "@/types/catalogo";

interface Props {
  kits: KitParaConfigurador[];
  alEmpezarDesdeCero: () => void;
  alEmpezarDesdeKit: (kit: KitParaConfigurador) => void;
}

/** Punto de partida: banco vacío o la lista de materiales de un kit ya cargada. */
export function InicioConfigurador({ kits, alEmpezarDesdeCero, alEmpezarDesdeKit }: Props) {
  return (
    <section aria-labelledby="titulo-inicio" className="border border-linea bg-panel p-4 sm:p-5">
      <h2 id="titulo-inicio" className="mono-etiqueta text-gris">
        <span className="text-acento">{"// "}</span>Punto de partida
      </h2>

      <ul className="mt-4 grid border-t border-l border-linea sm:grid-cols-2 xl:grid-cols-4">
        <li className="border-r border-b border-linea">
          <button
            type="button"
            onClick={alEmpezarDesdeCero}
            className="flex h-full w-full flex-col justify-between gap-6 p-4 text-left transition-colors duration-100 hover:bg-panel-alto"
          >
            <span className="mono-etiqueta text-acento">00</span>
            <span>
              <span className="block font-semibold">Banco vacío</span>
              <span className="mt-1 block text-sm text-gris">Empieza por el microcontrolador</span>
            </span>
          </button>
        </li>
        {kits.map((kit, i) => (
          <li key={kit.slug} className="border-r border-b border-linea">
            <button
              type="button"
              onClick={() => alEmpezarDesdeKit(kit)}
              className="flex h-full w-full flex-col gap-2 p-4 text-left transition-colors duration-100 hover:bg-panel-alto"
            >
              <span className="mono-etiqueta flex justify-between text-gris-claro">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <span>{kit.piezas.reduce((n, p) => n + p.cantidad, 0)} piezas</span>
              </span>
              <Image
                src={kit.imagen}
                alt=""
                width={200}
                height={150}
                unoptimized
                className="h-20 w-auto self-center object-contain"
              />
              <span className="text-sm font-semibold">{kit.nombre}</span>
              <span className="font-mono text-[12px] text-gris">
                BOM del kit · {formatearPrecio(kit.precioCentimos)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-gris">
        Un montaje del configurador se compra pieza a pieza y no incluye curso ni código QR. Para
        eso, los{" "}
        <Link href="/kits" className="text-tinta underline underline-offset-4 hover:text-acento">
          kits
        </Link>
        .
      </p>
    </section>
  );
}
