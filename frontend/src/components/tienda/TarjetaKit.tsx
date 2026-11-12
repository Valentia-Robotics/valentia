import Image from "next/image";
import Link from "next/link";
import { FotoKitViaje } from "@/components/tienda/FotoKitViaje";
import { PIE_TARJETA, TARJETA_TIENDA } from "@/components/ui/tarjeta";
import { cn, precioDeKit } from "@/lib/utils";
import type { KitResumen } from "@/lib/catalogo";

/** Tarjeta de un kit para el listado /kits. Toda la tarjeta es un enlace a su ficha. */
export function TarjetaKit({ kit }: { kit: KitResumen }) {
  return (
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
        <h2 className="text-xl leading-snug font-medium text-pretty sm:text-2xl">
          {/* El enlace "estira" su zona de clic a toda la tarjeta */}
          <Link href={`/kits/${kit.slug}`} className="after:absolute after:inset-0">
            {kit.nombre}
          </Link>
        </h2>
        <p className="mt-2 text-base text-gris">
          Desde {kit.edadMinima} años · {kit.nivel}
        </p>
        <p className="mt-3 flex-1 text-lg leading-snug text-tinta/75">{kit.eslogan}</p>
        <div className={PIE_TARJETA}>
          <span className="text-xl font-medium tabular-nums">
            {precioDeKit(kit.precioCentimos)}
          </span>
          <span
            aria-hidden="true"
            className="inline-flex h-10 items-center rounded-full bg-tinta px-5 text-sm font-medium text-white transition-colors group-hover:bg-acento"
          >
            Ver kit
          </span>
        </div>
      </div>
    </article>
  );
}
