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
  tituloExacto = false,
  imagen,
  indexar = true,
}: {
  /** Título de la pestaña ("Kits" → «Kits · Valentia»). Sin título = el de la portada. */
  titulo?: string;
  descripcion: string;
  /** Dirección de la página, empezando por "/" (será la canónica) */
  ruta: string;
  tipo?: "website" | "article";
  /** true = el título tal cual, sin «· Valentia» (los artículos ya lo traen medido a 60 caracteres) */
  tituloExacto?: boolean;
  /** Foto para compartir (si no, la tarjeta de la web) */
  imagen?: { url: string; alt: string };
  /** false = «noindex, follow» (por ejemplo, la página 2 de un listado vacío) */
  indexar?: boolean;
}): Metadata {
  // En las redes se ve el título completo (la plantilla «%s · Valentia» solo vale para la pestaña)
  const tituloRedes = titulo
    ? tituloExacto
      ? titulo
      : `${titulo} · ${marca.nombre}`
    : `${marca.nombre}: ${marca.lema}`;
  const imagenes = imagen ? [{ url: imagen.url, alt: imagen.alt }] : undefined;
  return {
    ...(titulo ? { title: tituloExacto ? { absolute: titulo } : titulo } : {}),
    description: descripcion,
    alternates: { canonical: ruta },
    ...(indexar ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title: tituloRedes,
      description: descripcion,
      url: ruta,
      siteName: marca.nombre,
      locale: "es_ES",
      type: tipo,
      ...(imagenes ? { images: imagenes } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: tituloRedes,
      description: descripcion,
      ...(imagenes ? { images: imagenes } : {}),
    },
  };
}
