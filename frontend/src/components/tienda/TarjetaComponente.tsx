import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { BotonAnadirCarrito } from "@/components/tienda/BotonAnadirCarrito";
import { fichaTecnica } from "@/lib/fichaTecnica";
import { formatearPrecio } from "@/lib/utils";
import type { ComponenteCatalogo } from "@/types/catalogo";
import { textoTienda } from "@/config/stock";

/** Tarjeta de un componente suelto para /componentes, con sus datos técnicos desplegables. */
export function TarjetaComponente({ componente }: { componente: ComponenteCatalogo }) {
  const agotado = componente.stock === 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-tarjeta bg-white ring-1 ring-tinta/15 transition-[box-shadow,translate] duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--color-acento)]">
      <Link href={`/componentes/${componente.slug}`} tabIndex={-1} className="block bg-niebla p-6">
        <Image
          src={componente.imagen}
          alt={`Foto de ${componente.nombre}`}
          width={240}
          height={240}
          unoptimized
          className="mx-auto aspect-square h-auto w-full max-w-48"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-sans text-lg font-medium">
          <Link href={`/componentes/${componente.slug}`} className="hover:text-acento">
            {componente.nombre}
          </Link>
        </h3>
        <p className="mt-1 text-gris">{componente.resumen}</p>

        {/* <details> despliega los datos técnicos sin necesidad de JavaScript */}
        <details className="group mt-4 flex-1 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-acento [&::-webkit-details-marker]:hidden">
            Datos técnicos
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180"
            />
          </summary>
          <p className="mt-2 text-tinta/80">{componente.descripcion}</p>
          <dl className="mt-2 divide-y divide-linea">
            {fichaTecnica(componente).map((dato) => (
              <div key={dato.nombre} className="flex justify-between gap-4 py-1.5">
                <dt className="text-gris">{dato.nombre}</dt>
                <dd className="text-right">{dato.valor}</dd>
              </div>
            ))}
          </dl>
        </details>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xl font-medium">{formatearPrecio(componente.precioCentimos)}</p>
            <p className="font-mono text-xs text-gris">
              ● {textoTienda(componente.stock, componente.enReposicion)}
            </p>
          </div>
          <BotonAnadirCarrito
            articulo={{
              id: `componente:${componente.slug}`,
              tipo: "componente",
              slug: componente.slug,
              nombre: componente.nombre,
              precioCentimos: componente.precioCentimos,
              imagen: componente.imagen,
            }}
            texto="Añadir"
            tamano="md"
            disabled={agotado}
          />
        </div>
      </div>
    </article>
  );
}
