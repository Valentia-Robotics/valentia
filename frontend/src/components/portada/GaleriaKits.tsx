import Image from "next/image";
import Link from "next/link";

export interface KitGaleria {
  slug: string;
  nombre: string;
  imagen: string;
  nivel: string;
  edadMinima: number;
  precio: string;
  lecciones: number;
}

/**
 * LOS KITS DE LA PORTADA, EN FOTOS: una tarjeta sencilla por kit (foto, nombre, nivel, edad y
 * precio). Toda la tarjeta es un enlace a su ficha. Sin efectos de ratón: se entiende a la primera,
 * también en el móvil (antes era una tabla con la foto siguiendo al cursor).
 * La foto NO usa FotoKitViaje: el kit destacado de arriba ya la usa y el nombre solo puede salir una vez.
 */
export function GaleriaKits({ kits }: { kits: KitGaleria[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {kits.map((kit) => (
        <li key={kit.slug}>
          <Link
            href={`/kits/${kit.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-tarjeta bg-white ring-1 ring-tinta/15 transition-[box-shadow,translate] duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--color-acento)]"
          >
            <div className="bg-niebla px-6 pt-6 pb-3">
              <Image
                src={kit.imagen}
                alt={`Foto del kit ${kit.nombre}`}
                width={800}
                height={600}
                unoptimized
                className="mx-auto h-auto w-full transition-[scale] duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h4 className="text-xl font-medium">{kit.nombre}</h4>
              <p className="mt-1 text-sm text-gris">
                {kit.nivel} · desde {kit.edadMinima} años · curso de {kit.lecciones}{" "}
                {kit.lecciones === 1 ? "lección" : "lecciones"}
              </p>
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="text-lg font-medium tabular-nums">{kit.precio}</span>
                <span
                  aria-hidden="true"
                  className="font-mono text-xs text-tinta/70 transition-colors group-hover:text-acento"
                >
                  Ver kit →
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
