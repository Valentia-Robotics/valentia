import Image from "next/image";
import Link from "next/link";

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
 */
export function GaleriaKits({
  kits,
  primeraReferencia = 1,
}: {
  kits: KitGaleria[];
  /** Número del primer kit (U1…) */
  primeraReferencia?: number;
}) {
  return (
    <ul
      className={
        kits.length >= 3 ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "grid gap-6 sm:grid-cols-2"
      }
    >
      {kits.map((kit, i) => (
        <li key={kit.slug}>
          {/* Ficha técnica sobre la placa: cristal oscuro con filete fino, la foto en una ventana
              clara con marcas de corte en las esquinas y los datos como una tabla de especificaciones */}
          <Link
            href={`/kits/${kit.slug}`}
            className="group flex h-full flex-col rounded-recto border border-white/15 bg-black/25 p-3 backdrop-blur-[2px] transition-[border-color,background-color] duration-300 hover:border-cobre/70 hover:bg-black/35"
          >
            <div className="relative overflow-hidden rounded-recto bg-niebla">
              <span className="absolute top-3 left-3 font-mono text-[11px] text-placa">
                U{primeraReferencia + i}
              </span>
              <span className="absolute top-3 right-3 font-mono text-[11px] text-tinta/55">
                {kit.nivel}
              </span>
              {/* Marcas de corte */}
              {[
                "top-1.5 left-1.5 border-t border-l",
                "top-1.5 right-1.5 border-t border-r",
                "bottom-1.5 left-1.5 border-b border-l",
                "bottom-1.5 right-1.5 border-b border-r",
              ].map((c) => (
                <span
                  key={c}
                  aria-hidden="true"
                  className={`absolute size-2.5 border-tinta/30 ${c}`}
                />
              ))}
              <Image
                src={kit.imagen}
                alt={`Foto del kit ${kit.nombre}`}
                width={800}
                height={600}
                unoptimized
                className="mx-auto h-auto max-h-60 w-auto max-w-full px-6 py-9 transition-[scale] duration-500 group-hover:scale-[1.04]"
              />
            </div>

            <div className="flex flex-1 flex-col px-3 pt-5 pb-3 text-white">
              <h3 className="text-xl leading-snug font-medium">{kit.nombre}</h3>
              {kit.hace.length > 0 && (
                <p className="mt-2 font-serif text-base leading-snug text-white/75">
                  {kit.hace.slice(0, 2).join(". ")}.
                </p>
              )}
              <dl className="mt-5 border-t border-dotted border-white/25 font-mono text-xs">
                {[
                  ["Edad", `desde ${kit.edadMinima} años`],
                  ["Montaje", kit.montaje],
                  ["Curso", `${kit.lecciones} ${kit.lecciones === 1 ? "lección" : "lecciones"}`],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-4 border-b border-dotted border-white/25 py-2"
                  >
                    <dt className="text-white/55">{k}</dt>
                    <dd className="text-right text-white/90">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                <span className="text-3xl font-medium tabular-nums">{kit.precio}</span>
                <span className="font-mono text-xs text-cobre transition-[translate] duration-300 group-hover:translate-x-1">
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
