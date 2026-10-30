import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { Contenedor } from "@/components/ui/Contenedor";
import { preguntasFrecuentes } from "@/config/preguntas";
import { esMarcador, tienda } from "@/config/tienda";
import { datosPreguntas } from "@/lib/datosEstructurados";
import { compraAbierta } from "@/lib/pagos";

export const metadata: Metadata = metadatosPagina({
  titulo: "Preguntas frecuentes",
  descripcion:
    "Si hace falta saber programar, para qué edad son los kits, envíos, devoluciones y cómo se activa el curso.",
  ruta: "/preguntas-frecuentes",
});

/** PREGUNTAS FRECUENTES: las respuestas están en src/config/preguntas.ts */
export default function PreguntasFrecuentes() {
  const grupos = preguntasFrecuentes({ compraAbierta: compraAbierta() });
  const email = tienda.empresa.email;

  return (
    <Contenedor className="py-12 sm:py-16">
      <DatosEstructurados datos={datosPreguntas(grupos.flatMap((g) => g.preguntas))} />
      <header className="max-w-2xl">
        <h1 className="text-4xl font-medium sm:text-5xl">Preguntas frecuentes.</h1>
        <p className="mt-4 text-lg text-gris">Lo que más nos preguntáis, contestado sin rodeos.</p>
      </header>

      <div className="mt-12 max-w-3xl space-y-12">
        {grupos.map((grupo) => (
          <section key={grupo.titulo}>
            <h2 className="text-2xl font-medium">{grupo.titulo}</h2>
            <div className="mt-4 divide-y divide-linea border-y border-linea">
              {grupo.preguntas.map((p) => (
                <details key={p.pregunta} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium [&::-webkit-details-marker]:hidden">
                    {p.pregunta}
                    <ChevronDown
                      aria-hidden="true"
                      className="size-5 shrink-0 text-gris transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="space-y-3 pb-6 text-gris">
                    {p.respuesta.map((parrafo) => (
                      <p key={parrafo}>{parrafo}</p>
                    ))}
                    {p.enlace && (
                      <p>
                        <Link
                          href={p.enlace.href}
                          className="font-medium text-acento underline-offset-2 hover:underline"
                        >
                          {p.enlace.texto} ›
                        </Link>
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {!esMarcador(email) && (
        <p className="mt-12 max-w-3xl rounded-tarjeta bg-niebla p-6 text-gris">
          ¿No está tu pregunta? Escríbenos a{" "}
          <a href={`mailto:${email}`} className="font-medium text-tinta underline">
            {email}
          </a>{" "}
          y te contestamos nosotros, no un robot (aunque nos gusten).
        </p>
      )}
    </Contenedor>
  );
}
