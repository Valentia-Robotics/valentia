import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { Contenedor } from "@/components/ui/Contenedor";
import { guias } from "@/config/guias";
import { datosMigas } from "@/lib/datosEstructurados";
import { CabeceraPagina } from "@/components/ui/CabeceraPagina";
import { metadatosPagina } from "@/lib/metadatos";

export const metadata: Metadata = metadatosPagina({
  titulo: "Guías de robótica, Arduino y ESP32 para principiantes",
  descripcion:
    "Guías sencillas para empezar en robótica: cómo elegir un kit, Arduino o ESP32, sensores, servos y cómo funciona un robot seguidor de líneas.",
  ruta: "/guias",
});

/** GUÍAS: listado de artículos (el texto está en src/config/guias.ts) */
export default function PaginaGuias() {
  return (
    <>
      <CabeceraPagina
        etiqueta="Guías"
        titulo="Aprende robótica desde cero."
        entradilla="Textos cortos y sin tecnicismos sobre cómo funcionan las piezas de un robot. Sirven para antes de montarlo y para después."
      />
      <Contenedor className="py-12 sm:py-16">
        <DatosEstructurados
          datos={datosMigas([
            { nombre: "Inicio", ruta: "/" },
            { nombre: "Guías", ruta: "/guias" },
          ])}
        />

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guias.map((guia) => (
            <li key={guia.slug}>
              <Link
                href={`/guias/${guia.slug}`}
                className="flex h-full flex-col rounded-tarjeta bg-niebla p-6 transition-[background-color,box-shadow,translate] duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-posada"
              >
                <BookOpen aria-hidden="true" className="size-6 text-acento" strokeWidth={1.6} />
                <h2 className="mt-4 text-2xl font-medium">{guia.titulo}</h2>
                <p className="mt-2 flex-1 text-gris">{guia.descripcion}</p>
                <p className="mt-4 text-sm text-gris">
                  {guia.minutos} min de lectura
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Contenedor>
    </>
  );
}
