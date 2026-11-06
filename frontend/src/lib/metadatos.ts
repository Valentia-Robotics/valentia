import type { Metadata } from "next";
import { marca } from "@/config/marca";

/**
 * METADATOS DE CADA PÁGINA PÚBLICA
 * Título, descripción, dirección canónica y la «tarjeta» que se ve al compartir el enlace
 * (WhatsApp, Telegram, TikTok, Facebook, X…).
 *
 * Next.js no hereda bien la parte de redes de una página a otra (si una página pone su propio
 * openGraph, se pierde el del layout), así que cada página pública usa esta función y lleva
 * su tarjeta completa. La imagen la ponen los archivos opengraph-image.tsx de cada carpeta.
 */
export function metadatosPagina({
  titulo,
  descripcion,
  ruta,
  tipo = "website",
}: {
  /** Título de la pestaña ("Kits" → «Kits · Valentia»). Sin título = el de la portada. */
  titulo?: string;
  descripcion: string;
  /** Dirección de la página, empezando por "/" (será la canónica) */
  ruta: string;
  tipo?: "website" | "article";
}): Metadata {
  // En las redes se ve el título completo (la plantilla «%s · Valentia» solo vale para la pestaña)
  const tituloRedes = titulo ? `${titulo} · ${marca.nombre}` : `${marca.nombre}: ${marca.lema}`;
  return {
    ...(titulo ? { title: titulo } : {}),
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: {
      title: tituloRedes,
      description: descripcion,
      url: ruta,
      siteName: marca.nombre,
      locale: "es_ES",
      type: tipo,
    },
    twitter: {
      card: "summary_large_image",
      title: tituloRedes,
      description: descripcion,
    },
  };
}
