/**
 * Sirve las imágenes subidas desde el panel cuando se usa el almacén local:
 * /subidas/componentes/abc.webp → archivo subidas/componentes/abc.webp
 * (No se usa la carpeta public/ porque Next.js solo sirve lo que había en ella al compilar.)
 * Si no está en el disco, la busca en el almacén privado (carpeta publicas/): ahí van las fotos del
 * panel en la web publicada, porque el disco de Render se vacía en cada publicación.
 */
import { leerSubida } from "@/lib/almacenamiento/local";
import { leerFotoPublica } from "@/lib/almacenamiento/publicoEnPrivado";

const cabeceras = (tipo: string) => ({
  "Content-Type": tipo,
  // El nombre de cada foto es único: el navegador puede guardarla para siempre
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
});

const noEncontrado = () => new Response("No encontrado", { status: 404 });

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
  if (!tipo) return noEncontrado();

  // 1) En el disco (desarrollo, o fotos antiguas que sigan ahí)
  try {
    const lectura = leerSubida(relativa);
    if (lectura) return new Response(new Uint8Array(await lectura), { headers: cabeceras(tipo) });
  } catch {
    // no está en el disco: se busca en el almacén
  }

  // 2) En el almacén privado (fotos del panel en la web publicada)
  const cuerpo = await leerFotoPublica(relativa).catch(() => null);
  return cuerpo ? new Response(cuerpo, { headers: cabeceras("image/webp") }) : noEncontrado();
}
