import type { Metadata } from "next";
import { ListadoBlog, leerPagina, metadatosListado } from "@/components/blog/ListadoBlog";

export const revalidate = 300;

interface Props {
  params: Promise<{ categoria: string; n: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria, n } = await params;
  return metadatosListado(categoria, leerPagina(n));
}

/** /blog/categoria/tutoriales/pagina/2… */
export default async function CategoriaBlogN({ params }: Props) {
  const { categoria, n } = await params;
  return <ListadoBlog categoria={categoria} pagina={leerPagina(n)} />;
}
