import Image from "next/image";
import Link from "next/link";
import type { CursoDeUsuario } from "@/lib/cursos";
import { BarraProgreso } from "./BarraProgreso";

/** Tarjeta de un curso en "Mis cursos", con su progreso y botón para continuar */
export function TarjetaCurso({ curso }: { curso: CursoDeUsuario }) {
  const terminado = curso.completadas === curso.totalLecciones;
  const empezado = curso.completadas > 0;
  const destino = `/cursos/${curso.slug}${curso.siguienteLeccion ? `/${curso.siguienteLeccion}` : ""}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-tarjeta bg-white shadow-tarjeta ring-1 ring-linea transition-shadow hover:shadow-flotante">
      {curso.kit && (
        <div className="bg-niebla px-6 pt-6 pb-2">
          <Image
            src={curso.kit.imagen}
            alt=""
            width={800}
            height={600}
            unoptimized
            className="mx-auto h-auto w-full max-w-xs"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs text-gris">
          {curso.kit ? `Kit ${curso.kit.nombre}` : "Curso"} · {curso.nivel}
        </p>
        <h2 className="mt-1 text-2xl font-medium">
          <Link href={destino} className="after:absolute after:inset-0">
            {curso.titulo}
          </Link>
        </h2>
        <p className="mt-2 flex-1 text-sm text-gris">{curso.descripcion}</p>

        <div className="mt-5">
          <BarraProgreso hechas={curso.completadas} total={curso.totalLecciones} />
        </div>
        <span
          aria-hidden="true"
          className="mt-5 text-sm font-medium text-acento group-hover:underline"
        >
          {terminado ? "Repasar el curso ›" : empezado ? "Continuar ›" : "Empezar ›"}
        </span>
      </div>
    </article>
  );
}
