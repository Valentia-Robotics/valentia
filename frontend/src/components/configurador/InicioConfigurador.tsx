"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { KitParaConfigurador } from "@/types/catalogo";

interface Props {
  kits: KitParaConfigurador[];
  alEmpezarDesdeCero: () => void;
  alEmpezarDesdeKit: (kit: KitParaConfigurador) => void;
}

/** "¿Cómo quieres empezar?": desde cero o con las piezas de un kit ya cargadas. */
export function InicioConfigurador({ kits, alEmpezarDesdeCero, alEmpezarDesdeKit }: Props) {
  return (
    <section aria-labelledby="titulo-inicio" className="rounded-tarjeta bg-niebla p-5 sm:p-6">
      <h2 id="titulo-inicio" className="text-2xl font-medium">
        ¿Cómo quieres empezar?
      </h2>
      <p className="mt-1 text-gris">
        Puedes empezar desde cero o coger uno de nuestros kits y cambiarle lo que quieras.
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <li>
          <button
            type="button"
            onClick={alEmpezarDesdeCero}
            className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-tarjeta bg-tinta p-5 text-center text-white transition-colors hover:bg-grafito"
          >
            <Sparkles aria-hidden="true" className="size-8 text-acento-claro" strokeWidth={1.5} />
            <span className="font-titulo text-lg font-medium">Desde cero</span>
            <span className="text-sm text-gris-claro">Empieza eligiendo una placa</span>
          </button>
        </li>
        {kits.map((kit) => (
          <li key={kit.slug}>
            <button
              type="button"
              onClick={() => alEmpezarDesdeKit(kit)}
              className="flex h-full w-full flex-col items-center gap-1 rounded-tarjeta bg-white p-4 text-center ring-1 ring-linea transition-shadow hover:shadow-flotante"
            >
              <Image
                src={kit.imagen}
                alt=""
                width={200}
                height={150}
                unoptimized
                className="h-24 w-auto object-contain"
              />
              <span className="text-xs text-gris">Partir del kit</span>
              <span className="font-medium">{kit.nombre}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Para quien compra un regalo sin saber de robótica: lo más sencillo es un kit cerrado */}
      <p className="mt-4 text-sm text-gris">
        ¿Es para regalar? Lo más fácil es un{" "}
        <Link href="/kits" className="text-tinta underline underline-offset-2 hover:text-acento">
          kit
        </Link>
        : trae todas las piezas y un curso en vídeo para montarlo. Los robots que se hacen aquí no
        llevan curso.
      </p>
    </section>
  );
}
