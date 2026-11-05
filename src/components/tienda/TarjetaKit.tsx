import Image from "next/image";
import Link from "next/link";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { precioDeKit } from "@/lib/utils";
import type { KitResumen } from "@/lib/catalogo";

/** Tarjeta de un kit para el listado /kits. Toda la tarjeta es un enlace a su ficha. */
export function TarjetaKit({ kit }: { kit: KitResumen }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-tarjeta bg-white shadow-tarjeta ring-1 ring-linea transition-shadow hover:shadow-flotante">
      <div className="bg-niebla px-6 pt-8 pb-4">
        <Image
          src={kit.imagen}
          alt=""
          width={800}
          height={600}
          unoptimized
          className="mx-auto h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
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
        <div className="mt-5 flex items-center justify-between">
          <span className="text-xl font-medium">{precioDeKit(kit.precioCentimos)}</span>
          <span aria-hidden="true" className="text-sm text-acento group-hover:underline">
            Ver kit ›
          </span>
        </div>
      </div>
    </article>
  );
}
