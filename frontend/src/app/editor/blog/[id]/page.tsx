import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guardarArticuloEditor } from "@/app/editor/blog/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { FormularioArticulo } from "@/components/blog/FormularioArticulo";
import { ESTADOS_EDITABLES_EDITOR, estadosArticulo } from "@/config/blog";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { exigirEditor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Artículo" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** Un artículo del editor. Si es de otra persona, la consulta no lo encuentra: 404. */
export default async function ArticuloEditor({ params, searchParams }: Props) {
  const { id } = await params;
  const editor = await exigirEditor(`/editor/blog/${id}`);
  if (!esId(id)) notFound();
  const [articulo, kits, { creado }] = await Promise.all([
    db.articulo.findFirst({ where: { id, autorId: editor.id } }),
    db.kit.findMany({
      where: { visible: true },
      orderBy: { orden: "asc" },
      select: { slug: true, nombre: true },
    }),
    searchParams,
  ]);
  if (!articulo) notFound();
  const editable = ESTADOS_EDITABLES_EDITOR.includes(articulo.estado);
  const { nombre, tono } = estadosArticulo[articulo.estado];

  return (
    <>
      <Cabecera
        titulo={articulo.titulo}
        descripcion={<Insignia tono={tono}>{nombre}</Insignia>}
        volver={{ href: "/editor/blog", etiqueta: "Mis artículos" }}
      />
      <div className="space-y-4">
        {creado === "1" && (
          <Aviso tipo="exito">Enviado a revisión. El admin lo verá en su panel.</Aviso>
        )}
        {articulo.motivos.length > 0 && (
          <div
            role="note"
            className="rounded-lg bg-aviso/10 p-4 text-sm text-aviso-oscuro ring-1 ring-aviso/30"
          >
            <p className="font-semibold">
              {articulo.estado === "RECHAZADO"
                ? "El admin lo ha rechazado"
                : "Para que salga antes, mejora esto"}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {articulo.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        <Caja titulo={editable ? "Corregir" : "Artículo"}>
          {editable ? (
            <FormularioArticulo
              accion={guardarArticuloEditor}
              articulo={articulo}
              kits={kits}
              textoBoton="Guardar y enviar a revisión"
            />
          ) : (
            // HTML limpio (sanitize-html al guardar)
            <div
              className="articulo"
              dangerouslySetInnerHTML={{ __html: articulo.contenidoHtml }}
            />
          )}
        </Caja>
      </div>
    </>
  );
}
