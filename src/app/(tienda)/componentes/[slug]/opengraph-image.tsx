import { ImageResponse } from "next/og";
import { TAMANO_REDES, TarjetaRedes, fotoRedes } from "@/lib/imagenRedes";
import { obtenerComponentePorSlug } from "@/lib/catalogo";
import { formatearPrecio } from "@/lib/utils";

/**
 * Imagen al compartir la ficha de un componente: nombre, resumen, precio y su foto 3D
 * (public/images/redes/componentes/<slug>.jpg, de npm run fotos:piezas).
 */
export const revalidate = 300;
export const alt = "Componente de robótica de Valentia";
export const size = TAMANO_REDES;
export const contentType = "image/png";

export default async function ImagenComponente({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const componente = await obtenerComponentePorSlug(slug);
  return new ImageResponse(
    <TarjetaRedes
      antetitulo="Componente"
      titulo={componente?.nombre ?? "Componentes de robótica"}
      subtitulo={componente?.resumen ?? "Las piezas de tus ideas."}
      pie={componente ? `${formatearPrecio(componente.precioCentimos)} · IVA incluido` : "Valentia"}
      foto={await fotoRedes(`images/redes/componentes/${slug}.jpg`)}
    />,
    size,
  );
}
