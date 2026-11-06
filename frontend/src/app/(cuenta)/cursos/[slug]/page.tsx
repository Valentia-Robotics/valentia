import { notFound, redirect } from "next/navigation";
import { cursoDesbloqueado, siguienteLeccion } from "@/lib/cursos";
import { exigirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** Entrar en un curso: te lleva a la primera lección que te queda por completar */
export default async function PaginaCurso({ params, searchParams }: Props) {
  const { slug } = await params;
  const { activado } = await searchParams;
  const usuario = await exigirUsuario(`/cursos/${slug}`);

  if (!(await cursoDesbloqueado(usuario.id, slug))) notFound();
  const leccion = await siguienteLeccion(usuario.id, slug);
  if (!leccion) notFound();

  // "?activado=1" (recién activado) se pasa a la lección para dar la bienvenida
  redirect(`/cursos/${slug}/${leccion}${activado === "1" ? "?activado=1" : ""}`);
}
