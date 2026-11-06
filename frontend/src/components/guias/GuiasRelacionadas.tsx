import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { Guia } from "@/config/guias";

/** «Aprende más»: guías que hablan de este kit o componente (enlaces internos para Google y para la gente) */
export function GuiasRelacionadas({
  guias,
  titulo = "Aprende más",
}: {
  guias: Guia[];
  titulo?: string;
}) {
  if (guias.length === 0) return null;
  return (
    <section aria-labelledby="titulo-guias-relacionadas">
      <h2 id="titulo-guias-relacionadas" className="text-2xl font-medium sm:text-3xl">
        {titulo}
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guias.map((guia) => (
          <li key={guia.slug}>
            <Link
              href={`/guias/${guia.slug}`}
              className="flex h-full flex-col rounded-tarjeta bg-niebla p-5 transition-colors hover:bg-linea/60"
            >
              <BookOpen aria-hidden="true" className="size-5 text-acento" strokeWidth={1.8} />
              <span className="mt-3 font-medium">{guia.titulo}</span>
              <span className="mt-1 text-sm text-gris">{guia.minutos} min de lectura</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
