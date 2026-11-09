import type { Metadata } from "next";
import { ListadoBlog, metadatosListado } from "@/components/blog/ListadoBlog";
import { CATEGORIAS_BLOG } from "@/config/blog";

export const revalidate = 300;
export const dynamicParams = false;

interface Props {
  params: Promise<{ categoria: string }>;
}

export function generateStaticParams() {
  return CATEGORIAS_BLOG.map((c) => ({ categoria: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  return metadatosListado(categoria, 1);
}

/** /blog/categoria/tutoriales… */
export default async function CategoriaBlog({ params }: Props) {
  const { categoria } = await params;
  return <ListadoBlog categoria={categoria} pagina={1} />;
}
