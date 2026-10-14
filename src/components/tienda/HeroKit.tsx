import Image from "next/image";
import { Boton } from "@/components/ui/Boton";
import { formatearPrecio } from "@/lib/utils";
import type { KitResumen } from "@/lib/catalogo";

/**
 * Portada a pantalla completa con el kit estrella (estilo web de Apple):
 * titular grande, subtítulo corto, dos enlaces y una imagen grande centrada.
 */
export function HeroKit({ kit }: { kit: KitResumen }) {
  return (
    <section
      aria-labelledby="titulo-hero"
      className="flex min-h-[calc(100dvh-var(--spacing-nav))] flex-col items-center overflow-hidden bg-white px-4 pt-14 text-center sm:pt-20"
    >
      <p className="animate-entrada text-sm font-medium tracking-wide text-acento uppercase">
        Kit estrella · {kit.nivel}
      </p>
      <h1
        id="titulo-hero"
        className="mt-3 animate-entrada text-5xl font-medium [animation-delay:80ms] sm:text-7xl lg:text-8xl"
      >
        {kit.nombre}
      </h1>
      <p className="mt-4 max-w-xl animate-entrada text-lg text-gris [animation-delay:160ms] sm:text-2xl">
        {kit.eslogan}
      </p>
      <p className="mt-3 animate-entrada text-sm text-gris [animation-delay:200ms]">
        {formatearPrecio(kit.precioCentimos)} · Curso incluido
      </p>

      <div className="mt-7 flex animate-entrada flex-wrap items-center justify-center gap-x-6 gap-y-3 [animation-delay:240ms]">
        <Boton href={`/kits/${kit.slug}#comprar`} variante="acento" tamano="lg">
          Comprar
        </Boton>
        <Boton href={`/kits/${kit.slug}`} variante="enlace" tamano="lg">
          Más información ›
        </Boton>
      </div>

      <div className="mt-6 flex w-full max-w-4xl flex-1 animate-entrada items-center justify-center [animation-delay:320ms]">
        <Image
          src={kit.imagen}
          alt={`Ilustración del kit ${kit.nombre}`}
          width={800}
          height={600}
          priority
          unoptimized
          // Altura limitada para que la imagen quepa en la primera pantalla
          className="h-auto max-h-[min(52dvh,560px)] w-auto max-w-full"
        />
      </div>
    </section>
  );
}
