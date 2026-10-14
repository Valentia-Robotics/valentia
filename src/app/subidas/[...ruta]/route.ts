/**
 * Sirve las imágenes subidas desde el panel cuando se usa el almacén local:
 * /subidas/componentes/abc.webp → archivo subidas/componentes/abc.webp
 * (No se usa la carpeta public/ porque Next.js solo sirve lo que había en ella al compilar.)
 */
import { leerSubida } from "@/lib/almacenamiento/local";

const tipos: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export async function GET(_peticion: Request, { params }: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await params;
  const relativa = ruta.join("/");
  const tipo = tipos[relativa.split(".").pop()?.toLowerCase() ?? ""];
  const lectura = tipo ? leerSubida(relativa) : null;
  if (!tipo || !lectura) return new Response("No encontrado", { status: 404 });

  try {
    const datos = await lectura;
    return new Response(new Uint8Array(datos), {
      headers: {
        "Content-Type": tipo,
        // El nombre de cada foto es único: el navegador puede guardarla para siempre
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
