import Image from "next/image";
import Link from "next/link";
import { CabeceraChip } from "./CabeceraChip";

export interface KitGaleria {
  slug: string;
  nombre: string;
  imagen: string;
  nivel: string;
  edadMinima: number;
  /** Tiempo de montaje («3 horas») */
  montaje: string;
  /** Qué hace, en dos o tres frases cortas (sus puntos fuertes sin lo del curso) */
  hace: string[];
  precio: string;
  lecciones: number;
}

/**
 * LOS DEMÁS KITS DE LA PORTADA, sobre la placa verde: cada uno es un chip blanco como el destacado
 * (cabecera negra con su referencia, patas plateadas y sombra cobre), con los mismos datos en corto.
 * Toda la tarjeta es un enlace a su ficha.
 * La foto NO usa FotoKitViaje: el kit destacado de arriba ya la usa y el nombre solo puede salir una vez.
 */
export function GaleriaKits({
  kits,
  primeraReferencia = 1,
}: {
  kits: KitGaleria[];
  /** Número del primer chip (U2 si el destacado ya es U1) */
  primeraReferencia?: number;
}) {
  return (
    <ul
      className={
        kits.length >= 3
          ? "grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          : "grid gap-8 sm:grid-cols-2 sm:gap-10"
      }
    >
      {kits.map((kit, i) => (
        <li key={kit.slug} className="chip-patas">
          <Link
            href={`/kits/${kit.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-recto bg-white text-tinta shadow-[0_6px_0_var(--color-cobre)] transition-[box-shadow,translate] duration-300 hover:-translate-y-1 hover:shadow-[0_10px_0_var(--color-cobre)] motion-reduce:hover:translate-0"
          >
            <CabeceraChip
              referencia={primeraReferencia + i}
              nivel={kit.nivel}
              edadMinima={kit.edadMinima}
            />
            <div className="bg-niebla px-6 py-5">
              <Image
                src={kit.imagen}
                alt={`Foto del kit ${kit.nombre}`}
                width={800}
                height={600}
                unoptimized
                className="mx-auto h-auto max-h-56 w-auto max-w-full transition-[scale] duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h4 className="text-xl font-medium">{kit.nombre}</h4>
              {kit.hace.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm text-tinta/85">
                  {kit.hace.map((texto) => (
                    <li key={texto} className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 bg-placa" />
                      {texto}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 font-mono text-xs text-tinta/60">
                Montaje: {kit.montaje} · curso de {kit.lecciones}{" "}
                {kit.lecciones === 1 ? "lección" : "lecciones"}
              </p>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-dotted border-tinta/25 pt-4">
                <span className="text-lg font-medium tabular-nums">{kit.precio}</span>
                <span
                  aria-hidden="true"
                  className="font-mono text-xs text-tinta/70 transition-colors group-hover:text-placa"
                >
                  Ver el kit →
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
