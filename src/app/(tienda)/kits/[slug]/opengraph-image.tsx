import { ImageResponse } from "next/og";
import { TAMANO_REDES, TarjetaRedes, fotoRedes } from "@/lib/imagenRedes";
import { obtenerKitPorSlug } from "@/lib/catalogo";
import { formatearPrecio } from "@/lib/utils";

/**
 * Imagen al compartir la ficha de un kit: nombre, frase, precio y la foto 3D del kit
 * (public/images/redes/kits/<slug>.png, de npm run fotos:piezas -- --redes).
 * Se rehace a la vez que la ficha (cada 5 minutos como mucho), así el precio no se queda viejo.
 */
export const revalidate = 300;
export const alt = "Kit de robótica de Valentia con curso incluido";
export const size = TAMANO_REDES;
export const contentType = "image/png";

export default async function ImagenKit({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kit = await obtenerKitPorSlug(slug);
  return new ImageResponse(
    <TarjetaRedes
      antetitulo="Kit con curso incluido"
      titulo={kit?.nombre ?? "Kits de robótica"}
      subtitulo={kit?.eslogan ?? "Construye tu propio robot paso a paso."}
      pie={
        kit ? `${formatearPrecio(kit.precioCentimos)} · Todas las piezas y el curso` : "Valentia"
      }
      foto={await fotoRedes(`images/redes/kits/${slug}.png`)}
    />,
    size,
  );
}
