import { ImageResponse } from "next/og";
import { marca } from "@/config/marca";
import { TAMANO_REDES, TarjetaRedes, fotoRedes } from "@/lib/imagenRedes";

/**
 * Imagen que aparece al compartir la web en redes sociales y mensajería (1200 × 630).
 * Se genera al compilar con la foto 3D del coche (public/images/redes/kits/vr1-starter-kit.png).
 * Cada kit tiene la suya en src/app/(tienda)/kits/[slug]/opengraph-image.tsx.
 */
export const alt = `${marca.nombre}: kits de robótica con curso incluido`;
export const size = TAMANO_REDES;
export const contentType = "image/png";

export default async function ImagenParaRedes() {
  return new ImageResponse(
    <TarjetaRedes
      antetitulo="Kits de robótica con curso"
      titulo="Construye tu propio robot."
      subtitulo="Todas las piezas y un curso en vídeo. No hace falta saber programar."
      pie={new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://valentiarobotics.com").host}
      foto={await fotoRedes("images/redes/kits/vr1-starter-kit.png")}
    />,
    size,
  );
}
