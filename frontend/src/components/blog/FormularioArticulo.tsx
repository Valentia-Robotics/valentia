"use client";

import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { AreaAdmin, CampoAdmin, CasillaAdmin, SelectorAdmin } from "@/components/admin/campos";
import { useFormulario } from "@/components/admin/useFormulario";
import { CATEGORIAS_BLOG, LARGO_META } from "@/config/blog";
import type { EstadoFormulario } from "@/lib/admin/formularios";

export interface ArticuloFormulario {
  id: string;
  titulo: string;
  slug: string;
  contenidoMd: string;
  extracto: string;
  palabraClave: string;
  metaTitulo: string;
  metaDescripcion: string;
  categoria: string;
  etiquetas: string[];
  imagenUrl: string | null;
  imagenAlt: string | null;
  imagenCredito: string | null;
  fuenteUrl: string | null;
  fuenteTitulo: string | null;
  kitsRelacionados: string[];
}

/** Escribir o corregir un artículo. Lo usan el admin y los editores (cada uno con su acción). */
export function FormularioArticulo({
  accion,
  articulo,
  kits,
  textoBoton,
}: {
  accion: (anterior: EstadoFormulario, formulario: FormData) => Promise<EstadoFormulario>;
  articulo?: ArticuloFormulario;
  kits: { slug: string; nombre: string }[];
  textoBoton: string;
}) {
  const { estado, alEnviar, enviando, error } = useFormulario(accion);

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-4">
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      {articulo && <input type="hidden" name="articuloId" value={articulo.id} />}

      <CampoAdmin etiqueta="Título" name="titulo" defaultValue={articulo?.titulo} error={error("titulo")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectorAdmin
          etiqueta="Categoría"
          name="categoria"
          defaultValue={articulo?.categoria ?? ""}
          error={error("categoria")}
          opciones={[
            { valor: "", texto: "Elige una categoría…" },
            ...CATEGORIAS_BLOG.map((c) => ({ valor: c.slug, texto: c.nombre })),
          ]}
        />
        <CampoAdmin
          etiqueta="Palabra clave principal"
          name="palabraClave"
          defaultValue={articulo?.palabraClave}
          error={error("palabraClave")}
          ayuda="Lo que buscaría alguien en Google para llegar aquí."
        />
      </div>
      <AreaAdmin
        etiqueta="Texto (Markdown)"
        name="contenidoMd"
        rows={18}
        defaultValue={articulo?.contenidoMd}
        error={error("contenidoMd")}
        ayuda="## para los subtítulos (al menos 2), **negrita**, - listas, [texto](dirección) para enlaces. Al menos 600 palabras."
      />
      <AreaAdmin
        etiqueta="Extracto (opcional)"
        name="extracto"
        rows={2}
        defaultValue={articulo?.extracto}
        error={error("extracto")}
        ayuda="Si lo dejas vacío, se usa el primer párrafo."
      />

      <details className="rounded-lg bg-niebla p-4" open={!articulo}>
        <summary className="cursor-pointer text-sm font-medium">Google y redes</summary>
        <div className="mt-4 space-y-4">
          <CampoAdmin
            etiqueta={`Título para Google (máx. ${LARGO_META.titulo})`}
            name="metaTitulo"
            defaultValue={articulo?.metaTitulo}
            error={error("metaTitulo")}
            ayuda="Vacío = el título del artículo, recortado."
          />
          <AreaAdmin
            etiqueta={`Descripción para Google (máx. ${LARGO_META.descripcion})`}
            name="metaDescripcion"
            rows={2}
            defaultValue={articulo?.metaDescripcion}
            error={error("metaDescripcion")}
            ayuda="Vacío = el extracto, recortado."
          />
          <CampoAdmin
            etiqueta="Dirección (slug)"
            name="slug"
            defaultValue={articulo?.slug}
            error={error("slug")}
            ayuda="Vacío = sale del título. Si cambias la de uno publicado, la antigua redirige a la nueva."
          />
          <CampoAdmin
            etiqueta="Etiquetas"
            name="etiquetas"
            defaultValue={articulo?.etiquetas.join(", ")}
            error={error("etiquetas")}
            ayuda="Separadas por comas: arduino, sensores, principiantes"
          />
        </div>
      </details>

      <details className="rounded-lg bg-niebla p-4" open={Boolean(articulo?.imagenUrl)}>
        <summary className="cursor-pointer text-sm font-medium">Imagen y fuente</summary>
        <div className="mt-4 space-y-4">
          <CampoAdmin
            etiqueta="Imagen (dirección)"
            name="imagenUrl"
            defaultValue={articulo?.imagenUrl ?? ""}
            error={error("imagenUrl")}
            ayuda="Solo de Unsplash, Pexels o Pixabay (licencia libre). Nunca la foto de una noticia."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoAdmin
              etiqueta="Texto alternativo de la imagen"
              name="imagenAlt"
              defaultValue={articulo?.imagenAlt ?? ""}
              error={error("imagenAlt")}
            />
            <CampoAdmin
              etiqueta="Crédito de la imagen"
              name="imagenCredito"
              defaultValue={articulo?.imagenCredito ?? ""}
              error={error("imagenCredito")}
              ayuda="Ejemplo: Ana Pérez en Unsplash"
            />
            <CampoAdmin
              etiqueta="Fuente (dirección)"
              name="fuenteUrl"
              defaultValue={articulo?.fuenteUrl ?? ""}
              error={error("fuenteUrl")}
            />
            <CampoAdmin
              etiqueta="Fuente (título)"
              name="fuenteTitulo"
              defaultValue={articulo?.fuenteTitulo ?? ""}
              error={error("fuenteTitulo")}
            />
          </div>
        </div>
      </details>

      {kits.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Kits relacionados</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {kits.map((k) => (
              <CasillaAdmin
                key={k.slug}
                etiqueta={k.nombre}
                name="kitsRelacionados"
                value={k.slug}
                defaultChecked={articulo?.kitsRelacionados.includes(k.slug)}
              />
            ))}
          </div>
        </fieldset>
      )}

      <BotonAdmin type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : textoBoton}
      </BotonAdmin>
    </form>
  );
}
