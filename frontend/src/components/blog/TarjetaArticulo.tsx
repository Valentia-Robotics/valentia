import Link from "next/link";
import { Newspaper } from "lucide-react";
import { categoriaPorSlug } from "@/config/blog";
import { minutosLectura } from "@/lib/blog/texto";
import { ImagenArticulo } from "./ImagenArticulo";

export interface ResumenArticulo {
  slug: string;
  titulo: string;
  extracto: string;
  categoria: string;
  imagenUrl: string | null;
  imagenAlt: string | null;
  palabras: number;
  publicadoEn: Date | null;
}

export const fechaLarga = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

/** Tarjeta de un artículo en los listados. Toda la tarjeta es un enlace. */
export function TarjetaArticulo({ articulo }: { articulo: ResumenArticulo }) {
  const categoria = categoriaPorSlug(articulo.categoria);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-tarjeta bg-white shadow-tarjeta ring-1 ring-linea transition-[box-shadow,translate] duration-300 hover:-translate-y-1 hover:shadow-flotante">
      <div className="aspect-video overflow-hidden bg-niebla">
        {articulo.imagenUrl ? (
          <ImagenArticulo
            url={articulo.imagenUrl}
            alt={articulo.imagenAlt ?? ""}
            ancho={640}
            className="size-full object-cover transition-[scale] duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-gris-claro">
            <Newspaper aria-hidden="true" className="size-10" strokeWidth={1.2} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {categoria && (
          <p className="text-xs font-medium tracking-wide text-acento uppercase">
            {categoria.nombre}
          </p>
        )}
        <h2 className="mt-2 text-xl font-medium">
          <Link href={`/blog/${articulo.slug}`} className="after:absolute after:inset-0">
            {articulo.titulo}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-3 flex-1 text-gris">{articulo.extracto}</p>
        <p className="mt-4 text-sm text-gris">
          {articulo.publicadoEn && (
            <time dateTime={articulo.publicadoEn.toISOString()}>
              {fechaLarga.format(articulo.publicadoEn)}
            </time>
          )}{" "}
          · {minutosLectura(articulo.palabras)} min de lectura
        </p>
      </div>
    </article>
  );
}
