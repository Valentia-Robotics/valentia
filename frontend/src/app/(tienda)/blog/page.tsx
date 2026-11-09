import type { Metadata } from "next";
import { ListadoBlog, metadatosListado } from "@/components/blog/ListadoBlog";

/** Se vuelve a generar al publicar (refrescarBlog) y, como mucho, cada 5 minutos */
export const revalidate = 300;

export const metadata: Metadata = metadatosListado(undefined, 1);

export default function PaginaBlog() {
  return <ListadoBlog pagina={1} />;
}
