import type { Metadata } from "next";
import { ListadoBlog, leerPagina, metadatosListado } from "@/components/blog/ListadoBlog";

export const revalidate = 300;

interface Props {
  params: Promise<{ n: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  return metadatosListado(undefined, leerPagina(n));
}

/** /blog/pagina/2, /blog/pagina/3… (la 1 es /blog) */
export default async function PaginaBlogN({ params }: Props) {
  const { n } = await params;
  return <ListadoBlog pagina={leerPagina(n)} />;
}
