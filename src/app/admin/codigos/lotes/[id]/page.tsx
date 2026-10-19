import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { TarjetaActivacion } from "@/components/compra/TarjetaActivacion";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonImprimirAdmin } from "@/components/admin/BotonImprimirAdmin";
import { Cabecera } from "@/components/admin/Cabecera";
import { obtenerLote } from "@/lib/admin/codigos";
import { fechaHora } from "@/lib/admin/formato";
import { urlActivacion } from "@/lib/qr";
import { exigirAdmin } from "@/lib/sesion";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Tarjetas para imprimir" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/**
 * TARJETAS DE UN LOTE, listas para imprimir y meter en las cajas.
 * Al imprimir solo salen las tarjetas (4 por hoja A4); el menú y los botones se ocultan.
 * Los códigos desactivados no se imprimen.
 * También se pueden descargar como un .zip de SVG para grabarlas y cortarlas con láser.
 */
export default async function TarjetasLote({ params, searchParams }: Props) {
  const { id } = await params;
  await exigirAdmin(`/admin/codigos/lotes/${id}`);
  const [lote, { nuevo }] = await Promise.all([obtenerLote(id), searchParams]);
  if (!lote) notFound();
  const imprimibles = lote.codigos.filter((c) => !c.desactivadoEn);
  const usados = lote.codigos.filter((c) => c.usadoEn).length;
  // Si la web aún apunta a este ordenador, los QR no funcionarán en el móvil de los clientes
  const dominio = new URL(urlActivacion("X")).hostname;
  const qrSoloLocal = dominio === "localhost" || dominio === "127.0.0.1";

  return (
    <>
      {/* Hoja A4 con márgenes pequeños al imprimir */}
      <style>{`@page { size: A4; margin: 10mm; }`}</style>

      <Cabecera
        titulo={`Tarjetas · ${lote.kit.nombre}`}
        volver={{ href: "/admin/codigos", etiqueta: "Códigos" }}
        descripcion={`${plural(lote.codigos.length, "código generado", "códigos generados")} el ${fechaHora(lote.creadoEn)} · ${usados} usados`}
        acciones={
          <>
            <BotonAdmin href={`/admin/codigos?lote=${lote.id}`} variante="secundario">
              Ver en la lista
            </BotonAdmin>
            {/* "download" hace que el navegador descargue el .zip en vez de abrir una página */}
            <BotonAdmin
              href={`/admin/codigos/lotes/${lote.id}/laser`}
              download
              prefetch={false}
              variante="secundario"
            >
              <Download aria-hidden="true" className="size-4" />
              Tarjetas para láser (.zip)
            </BotonAdmin>
            <BotonImprimirAdmin
              texto={`Imprimir ${plural(imprimibles.length, "tarjeta", "tarjetas")}`}
            />
          </>
        }
      />
      <div className="mb-6 space-y-3 print:hidden">
        {nuevo && (
          <Aviso tipo="exito">
            Códigos generados. Imprime las tarjetas y mete una en cada caja del kit.
          </Aviso>
        )}
        {qrSoloLocal && (
          <Aviso tipo="info">
            Los QR apuntan a {dominio}, es decir, a este ordenador: en el móvil de un cliente no
            funcionarán. Antes de grabar o imprimir tarjetas de verdad, pon la dirección real de la
            web en NEXT_PUBLIC_SITE_URL.
          </Aviso>
        )}
        {imprimibles.length < lote.codigos.length && (
          <Aviso tipo="info">
            {plural(
              lote.codigos.length - imprimibles.length,
              "código desactivado no se imprime",
              "códigos desactivados no se imprimen",
            )}
            .
          </Aviso>
        )}
        <p className="text-xs text-gris">
          Consejo: en la ventana de impresión, elige «Tamaño real» (100 %) y activa «Gráficos de
          fondo» si tu navegador lo pide. Salen 4 tarjetas por hoja. Para el láser, el .zip trae un
          SVG por tarjeta (negro = grabar, rojo = cortar) y un archivo LEEME con los pasos.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2 print:gap-4">
        {imprimibles.map((c) => (
          <TarjetaActivacion key={c.id} codigo={c.codigo} nombreKit={lote.kit.nombre} />
        ))}
      </div>
    </>
  );
}
