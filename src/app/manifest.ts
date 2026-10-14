import type { MetadataRoute } from "next";
import { marca } from "@/config/marca";

/** Manifest: permite "añadir a la pantalla de inicio" en el móvil con el icono de Valentia. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${marca.nombre} — ${marca.lema}`,
    short_name: marca.nombre,
    description: marca.descripcion,
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b0b0b",
    icons: [
      { src: "/images/brand/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/images/brand/icono-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
