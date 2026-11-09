import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { guardarArticuloAdmin } from "@/app/admin/blog/acciones";
import { BotonesEstadoArticulo } from "@/components/blog/BotonesEstadoArticulo";
import { FormularioArticulo } from "@/components/blog/FormularioArticulo";
import { estadosArticulo } from "@/config/blog";
import { fechaHora } from "@/lib/admin/formato";
import { minutosLectura } from "@/lib/blog/texto";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Artículo" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** UN ARTÍCULO: editarlo, ver cómo queda y decidir (publicar, cola, rechazar, despublicar) */
export default async function ArticuloAdmin({ params, searchParams }: Props) {
  const { id } = await params;
  await exigirAdmin(`/admin/blog/${id}`);
  if (!esId(id)) notFound();
  const [articulo, kits, { creado }] = await Promise.all([
    db.articulo.findUnique({ where: { id } }),
    db.kit.findMany({ orderBy: { orden: "asc" }, select: { slug: true, nombre: true } }),
    searchParams,
  ]);
  if (!articulo) notFound();
  const { nombre, tono } = estadosArticulo[articulo.estado];

  return (
    <>
      <Cabecera
        titulo={articulo.titulo}
        descripcion={
          <>
            <Insignia tono={tono}>{nombre}</Insignia>{" "}
            {articulo.origen === "AUTO" ? "Enviado por n8n" : `Escrito por ${articulo.autorNombre}`}
            {" · "}
            {articulo.palabras} palabras · {minutosLectura(articulo.palabras)} min
          </>
        }
        volver={{ href: `/admin/blog?estado=${articulo.estado}`, etiqueta: "Blog" }}
      />
      {creado === "1" && (
        <div className="mb-4">
          <Aviso tipo="exito">Artículo creado. Revisa los avisos y publícalo cuando quieras.</Aviso>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          {articulo.motivos.length > 0 && (
            <div role="note" className="rounded-lg bg-aviso/10 p-4 text-sm text-aviso-oscuro ring-1 ring-aviso/30">
              <p className="font-semibold">
                {articulo.estado === "RECHAZADO" ? "Motivo del rechazo" : "No pasa los filtros de calidad"}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {articulo.motivos.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          <Caja titulo="Editar">
            <FormularioArticulo
              accion={guardarArticuloAdmin}
              articulo={articulo}
              kits={kits}
              textoBoton="Guardar cambios"
            />
          </Caja>
          <Caja titulo="Vista previa del texto">
            {/* El mismo HTML limpio que sale en la web */}
            <div className="articulo" dangerouslySetInnerHTML={{ __html: articulo.contenidoHtml }} />
          </Caja>
        </div>

        <div className="min-w-0 space-y-4">
          <Caja titulo="Siguiente paso">
            <BotonesEstadoArticulo articuloId={articulo.id} estado={articulo.estado} />
          </Caja>
          <Caja titulo="Datos">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gris">Dirección</dt>
                <dd className="break-all">/blog/{articulo.slug}</dd>
              </div>
              <div>
                <dt className="text-xs text-gris">Título para Google</dt>
                <dd>{articulo.metaTitulo}</dd>
              </div>
              <div>
                <dt className="text-xs text-gris">Descripción para Google</dt>
                <dd>{articulo.metaDescripcion}</dd>
              </div>
              <div>
                <dt className="text-xs text-gris">Llegó</dt>
                <dd>{fechaHora(articulo.creadoEn)}</dd>
              </div>
              {articulo.programadoPara && (
                <div>
                  <dt className="text-xs text-gris">Saldrá</dt>
                  <dd>{fechaHora(articulo.programadoPara)}</dd>
                </div>
              )}
              {articulo.publicadoEn && (
                <div>
                  <dt className="text-xs text-gris">Publicado</dt>
                  <dd>{fechaHora(articulo.publicadoEn)}</dd>
                </div>
              )}
            </dl>
            {articulo.estado === "PUBLICADO" && (
              <BotonAdmin href={`/blog/${articulo.slug}`} variante="secundario" className="mt-4">
                Ver en la web
              </BotonAdmin>
            )}
          </Caja>
        </div>
      </div>
    </>
  );
}
