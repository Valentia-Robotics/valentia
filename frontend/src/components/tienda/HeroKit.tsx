import Image from "next/image";
import { FotoKitViaje } from "@/components/tienda/FotoKitViaje";
import { Boton } from "@/components/ui/Boton";
import { formatearPrecio } from "@/lib/utils";
import type { KitResumen } from "@/lib/catalogo";

/**
 * Bloque de la portada con el kit estrella (estilo web de Apple):
 * titular grande, subtítulo corto, dos enlaces y una imagen grande centrada.
 */
export function HeroKit({ kit, compraAbierta }: { kit: KitResumen; compraAbierta: boolean }) {
  return (
    <section
      aria-labelledby="titulo-hero"
      className="flex flex-col items-center overflow-x-clip bg-niebla px-4 pt-6 pb-12 text-center diferido sm:pt-10"
    >
      <p className="aparecer text-sm font-medium tracking-wide text-acento uppercase">
        Kit destacado · {kit.nivel}
      </p>
      <h2 id="titulo-hero" className="aparecer mt-3 text-5xl font-medium sm:text-7xl">
        {kit.nombre}
      </h2>
      <p className="aparecer mt-4 max-w-xl text-lg text-gris sm:text-2xl">{kit.eslogan}</p>
      <p className="aparecer mt-3 text-sm text-gris">
        {formatearPrecio(kit.precioCentimos)} · Curso incluido
      </p>

      <div className="aparecer mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Boton href={`/kits/${kit.slug}#comprar`} variante="acento" tamano="lg">
          {/* Con la tienda cerrada, la ficha enseña ahí el «Avísame»: el botón no promete una compra */}
          {compraAbierta ? "Comprar" : "Avísame cuando abra"}
        </Boton>
        <Boton href={`/kits/${kit.slug}`} variante="enlace" tamano="lg">
          Ver el kit ›
        </Boton>
      </div>

      <div className="acercar mt-10 flex w-full max-w-4xl items-center justify-center">
        <FotoKitViaje slug={kit.slug}>
          <Image
            src={kit.imagen}
            alt={`Foto del kit ${kit.nombre} montado`}
            width={800}
            height={600}
            unoptimized
            // Altura limitada para que la imagen quepa en la primera pantalla
            className="h-auto max-h-[min(52dvh,560px)] w-auto max-w-full"
          />
        </FotoKitViaje>
      </div>
    </section>
  );
}
