/**
 * Foto de un artículo. Vienen de bancos de imágenes (Unsplash, Pexels, Pixabay): se pide el tamaño
 * justo a su servidor, en lugar de descargar el original de varios megas.
 * Con ancho y alto fijos (sin saltos al cargar) y diferida salvo la principal.
 */
export function urlConTamano(url: string, ancho: number): string {
  try {
    const u = new URL(url);
    if (u.hostname === "images.unsplash.com") {
      u.searchParams.set("w", String(ancho));
      u.searchParams.set("q", "75");
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
    } else if (u.hostname === "images.pexels.com") {
      u.searchParams.set("auto", "compress");
      u.searchParams.set("cs", "tinysrgb");
      u.searchParams.set("w", String(ancho));
    }
    return u.toString();
  } catch {
    return url; // una ruta propia (/images/…)
  }
}

export function ImagenArticulo({
  url,
  alt,
  ancho,
  prioridad = false,
  className,
}: {
  url: string;
  alt: string;
  ancho: number;
  prioridad?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ya viene al tamaño justo de su banco
    <img
      src={urlConTamano(url, ancho)}
      alt={alt}
      width={ancho}
      height={Math.round((ancho * 9) / 16)}
      loading={prioridad ? "eager" : "lazy"}
      fetchPriority={prioridad ? "high" : undefined}
      decoding="async"
      className={className}
    />
  );
}
