import Image from "next/image";
import Link from "next/link";
import { FotoKitViaje } from "@/components/tienda/FotoKitViaje";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { PIE_TARJETA, TARJETA_TIENDA } from "@/components/ui/tarjeta";
import { cn, precioDeKit } from "@/lib/utils";
import type { KitResumen } from "@/lib/catalogo";

/** Tarjeta de un kit para el listado /kits. Toda la tarjeta es un enlace a su ficha. */
export function TarjetaKit({ kit }: { kit: KitResumen }) {
  return (
    // Al pasar el ratón se levanta con una sombra recta azul (estilo taller)
    <article className={cn("group relative flex flex-col overflow-hidden", TARJETA_TIENDA)}>
      <div className="relative bg-niebla px-6 pt-6 pb-4">
        <FotoKitViaje slug={kit.slug}>
          <Image
            src={kit.imagen}
            alt={kit.nombre}
            width={800}
            height={600}
            unoptimized
            className="mx-auto h-auto w-full transition-[scale] duration-500 group-hover:scale-[1.03]"
          />
        </FotoKitViaje>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap gap-2">
          <Etiqueta>{kit.nivel}</Etiqueta>
          <Etiqueta>+{kit.edadMinima} años</Etiqueta>
        </div>
        <h2 className="mt-4 text-2xl font-medium">
          {/* El enlace "estira" su zona de clic a toda la tarjeta */}
          <Link href={`/kits/${kit.slug}`} className="after:absolute after:inset-0">
            {kit.nombre}
          </Link>
        </h2>
        <p className="mt-2 flex-1 text-gris">{kit.eslogan}</p>
        <p className="mt-4 text-sm text-gris">
          Incluye el curso «{kit.curso.titulo}» ({kit.curso._count.lecciones}{" "}
          {kit.curso._count.lecciones === 1 ? "lección" : "lecciones"})
        </p>
        <div className={PIE_TARJETA}>
          <span className="text-xl font-medium">{precioDeKit(kit.precioCentimos)}</span>
          <span
            aria-hidden="true"
            className="font-mono text-xs text-tinta/70 transition-colors group-hover:text-acento"
          >
            Ver kit →
          </span>
        </div>
      </div>
    </article>
  );
}
