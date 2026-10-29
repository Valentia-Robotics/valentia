import Link from "next/link";
import { Award, CircleCheck } from "lucide-react";
import type { DatosLeccion } from "@/lib/cursos";
import { cn } from "@/lib/utils";
import { BarraProgreso } from "./BarraProgreso";

interface Props {
  cursoSlug: string;
  cursoTitulo: string;
  temario: DatosLeccion["temario"];
  actual: string;
}

/**
 * Lista de lecciones del curso, con las completadas marcadas.
 * En móvil se pliega en un desplegable para no ocupar toda la pantalla.
 */
export function TemarioLateral({ cursoSlug, cursoTitulo, temario, actual }: Props) {
  const hechas = temario.filter((l) => l.completada).length;

  const lista = (
    <ol className="mt-4 space-y-1">
      {temario.map((l) => {
        const esActual = l.slug === actual;
        return (
          <li key={l.slug}>
            <Link
              href={`/cursos/${cursoSlug}/${l.slug}`}
              aria-current={esActual ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors",
                esActual ? "bg-tinta text-white" : "hover:bg-white",
              )}
            >
              {l.completada ? (
                <CircleCheck
                  aria-label="Completada"
                  className={cn("size-5 shrink-0", esActual ? "text-acento-claro" : "text-exito")}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ring-1",
                    esActual ? "ring-white/50" : "ring-linea",
                  )}
                >
                  {l.orden}
                </span>
              )}
              <span className="flex-1">{l.titulo}</span>
              <span className={cn("text-xs", esActual ? "text-gris-claro" : "text-gris")}>
                {l.duracionMin} min
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );

  return (
    <nav aria-label="Lecciones del curso" className="rounded-tarjeta bg-niebla p-4 sm:p-5">
      <Link href="/cursos" className="text-xs text-gris hover:text-tinta">
        ‹ Mis cursos
      </Link>
      <p className="mt-2 font-titulo text-lg font-medium">{cursoTitulo}</p>
      <div className="mt-3">
        <BarraProgreso hechas={hechas} total={temario.length} />
      </div>
      {hechas === temario.length && temario.length > 0 && (
        <Link
          href={`/cursos/${cursoSlug}/diploma`}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-acento hover:underline"
        >
          <Award aria-hidden="true" className="size-4" />
          Ver tu diploma ›
        </Link>
      )}

      {/* Móvil: desplegable · Ordenador: siempre visible */}
      <details className="group lg:hidden">
        <summary className="mt-4 cursor-pointer text-sm font-medium text-acento">
          Ver las {temario.length} lecciones
        </summary>
        {lista}
      </details>
      <div className="hidden lg:block">{lista}</div>
    </nav>
  );
}
