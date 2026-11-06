import { notFound } from "next/navigation";
import { CARAS_MUESTRA, tarjetaMuestraSvg } from "@/lib/tarjetaLaser/muestra";

// Las dos caras se generan al compilar la web (archivo estático, sin coste en cada visita)
export const dynamicParams = false;

export function generateStaticParams() {
  return CARAS_MUESTRA.map((cara) => ({ cara: `${cara}.svg` }));
}

/** /tarjeta-muestra/delantera.svg y /tarjeta-muestra/trasera.svg: la tarjeta de la portada */
export async function GET(_peticion: Request, { params }: { params: Promise<{ cara: string }> }) {
  const { cara } = await params;
  const nombre = CARAS_MUESTRA.find((c) => `${c}.svg` === cara);
  if (!nombre) notFound();
  return new Response(tarjetaMuestraSvg(nombre), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
