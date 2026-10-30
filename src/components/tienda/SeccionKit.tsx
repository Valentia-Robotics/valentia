import Image from "next/image";
import { Boton } from "@/components/ui/Boton";
import { formatearPrecio, cn } from "@/lib/utils";
import type { KitResumen } from "@/lib/catalogo";

/**
 * Sección de la portada dedicada a un kit. Se alternan fondos claros y oscuros
 * con el parámetro "tema". El contenido aparece suavemente al hacer scroll.
 */
export function SeccionKit({ kit, tema }: { kit: KitResumen; tema: "claro" | "oscuro" }) {
  const oscuro = tema === "oscuro";

  return (
    <section
      aria-labelledby={`titulo-${kit.slug}`}
      className={cn(
        "overflow-hidden px-4 pt-20 pb-10 text-center diferido sm:pt-28",
        oscuro ? "bg-tinta text-white" : "bg-niebla text-tinta",
      )}
    >
      <div className="aparecer mx-auto max-w-3xl">
        <p
          className={cn(
            "text-sm font-medium tracking-wide uppercase",
            oscuro ? "text-acento-claro" : "text-acento",
          )}
        >
          {kit.nivel} · desde {kit.edadMinima} años
        </p>
        <h2 id={`titulo-${kit.slug}`} className="mt-3 text-4xl font-medium sm:text-6xl">
          {kit.nombre}
        </h2>
        <p className={cn("mt-4 text-lg sm:text-2xl", oscuro ? "text-gris-claro" : "text-gris")}>
          {kit.eslogan}
        </p>
        <p className={cn("mt-3 text-sm", oscuro ? "text-gris-claro" : "text-gris")}>
          {formatearPrecio(kit.precioCentimos)} · Curso de {kit.curso._count.lecciones} lecciones
          incluido
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Boton href={`/kits/${kit.slug}#comprar`} variante={oscuro ? "claro" : "primario"}>
            Comprar
          </Boton>
          <Boton href={`/kits/${kit.slug}`} variante={oscuro ? "enlace-claro" : "enlace"}>
            Más información ›
          </Boton>
        </div>
      </div>

      <div className="aparecer mx-auto mt-10 max-w-3xl">
        <Image
          src={kit.imagen}
          alt={`Foto del kit ${kit.nombre} montado`}
          width={800}
          height={600}
          unoptimized
          className="mx-auto h-auto w-full"
        />
      </div>
    </section>
  );
}
