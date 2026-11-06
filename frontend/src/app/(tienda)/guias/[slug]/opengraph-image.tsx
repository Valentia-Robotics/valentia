import { ImageResponse } from "next/og";
import { obtenerGuia } from "@/config/guias";
import { TAMANO_REDES, TarjetaRedes, fotoRedes } from "@/lib/imagenRedes";

/** Imagen al compartir una guía: su título y la foto del primer kit del que habla */
export const alt = "Guía de robótica de Valentia";
export const size = TAMANO_REDES;
export const contentType = "image/png";

export default async function ImagenGuia({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guia = obtenerGuia(slug);
  const kit = guia?.kits[0];
  return new ImageResponse(
    <TarjetaRedes
      antetitulo="Guía"
      titulo={guia?.titulo ?? "Guías de robótica"}
      subtitulo={guia ? `${guia.minutos} min de lectura` : "Aprende robótica desde cero."}
      pie="valentiarobotics.com/guias"
      foto={kit ? await fotoRedes(`images/redes/kits/${kit}.png`) : null}
    />,
    size,
  );
}
