import Image from "next/image";
import Link from "next/link";
import { PIE_TARJETA, TARJETA_TIENDA } from "@/components/ui/tarjeta";

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
 * LOS DEMÁS KITS DE LA PORTADA: una tarjeta por kit con los mismos datos que el destacado, en corto
 * (edad, nivel, montaje, qué hace, curso y precio). Toda la tarjeta es un enlace a su ficha.
 * La foto NO usa FotoKitViaje: el kit destacado de arriba ya la usa y el nombre solo puede salir una vez.
 */
export function GaleriaKits({ kits }: { kits: KitGaleria[] }) {
  return (
    <ul
      className={
        kits.length >= 3 ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-5 sm:grid-cols-2"
      }
    >
      {kits.map((kit) => (
        <li key={kit.slug}>
          <Link
            href={`/kits/${kit.slug}`}
            className={`group flex h-full flex-col overflow-hidden ${TARJETA_TIENDA}`}
          >
            <div className="relative bg-niebla px-6 pt-10 pb-4">
              <p className="absolute top-3 left-4 font-mono text-[11px] text-tinta/55">
                {kit.nivel} · desde {kit.edadMinima} años
              </p>
              <Image
                src={kit.imagen}
                alt={`Foto del kit ${kit.nombre}`}
                width={800}
                height={600}
                unoptimized
                className="mx-auto h-auto max-h-64 w-auto max-w-full transition-[scale] duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h4 className="text-xl font-medium">{kit.nombre}</h4>
              {kit.hace.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm text-tinta/85">
                  {kit.hace.map((texto) => (
                    <li key={texto} className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 bg-acento" />
                      {texto}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 font-mono text-xs text-tinta/60">
                Montaje: {kit.montaje} · curso de {kit.lecciones}{" "}
                {kit.lecciones === 1 ? "lección" : "lecciones"}
              </p>
              <div className={`mt-auto ${PIE_TARJETA}`}>
                <span className="text-lg font-medium tabular-nums">{kit.precio}</span>
                <span
                  aria-hidden="true"
                  className="font-mono text-xs text-tinta/70 transition-colors group-hover:text-acento"
                >
                  Ver qué trae →
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
