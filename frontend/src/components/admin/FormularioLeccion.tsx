"use client";

import { useState } from "react";
import { guardarLeccion } from "@/app/admin/cursos/acciones";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { Caja } from "./Caja";
import { AreaAdmin, CampoAdmin, SelectorAdmin } from "./campos";
import { useFormulario } from "./useFormulario";

/** Un servicio de vídeo tal y como lo necesita el formulario */
export interface OpcionVideo {
  id: string;
  nombre: string;
  ejemplo: string;
}

/**
 * Formulario de una lección: título, descripción, duración y vídeo.
 * El vídeo se elige con el servicio (YouTube, Vimeo…) y su dirección o identificador.
 */
export function FormularioLeccion({
  cursoId,
  leccion,
  servicios,
  videoInicial,
}: {
  cursoId: string;
  leccion?: { id: string; slug: string; titulo: string; descripcion: string; duracionMin: number };
  servicios: OpcionVideo[];
  /** Vídeo guardado: servicio ("" = sin vídeo) y dirección */
  videoInicial: { proveedor: string; valor: string };
}) {
  const { estado, alEnviar, enviando, error } = useFormulario(guardarLeccion);
  const [proveedor, setProveedor] = useState(videoInicial.proveedor);
  const servicio = servicios.find((s) => s.id === proveedor);

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-6">
      <input type="hidden" name="cursoId" value={cursoId} />
      {leccion && <input type="hidden" name="leccionId" value={leccion.id} />}
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}

      <Caja titulo="Lección">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoAdmin
            etiqueta="Título"
            name="titulo"
            defaultValue={leccion?.titulo}
            error={error("titulo")}
          />
          {leccion ? (
            <CampoAdmin
              etiqueta="Dirección (slug)"
              value={leccion.slug}
              disabled
              ayuda="No se puede cambiar."
            />
          ) : (
            <CampoAdmin
              etiqueta="Dirección (slug)"
              name="slug"
              placeholder="Se crea sola a partir del título"
              error={error("slug")}
              ayuda="Opcional. Después no se puede cambiar."
            />
          )}
          <AreaAdmin
            etiqueta="Explicación"
            name="descripcion"
            defaultValue={leccion?.descripcion}
            error={error("descripcion")}
            rows={6}
            ayuda="El texto que acompaña al vídeo."
            className="sm:col-span-2"
          />
          <CampoAdmin
            etiqueta="Duración (minutos)"
            name="duracionMin"
            inputMode="numeric"
            defaultValue={leccion?.duracionMin ?? ""}
            error={error("duracionMin")}
          />
        </div>
      </Caja>

      <Caja titulo="Vídeo">
        <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
          <SelectorAdmin
            etiqueta="Servicio"
            name="proveedorVideo"
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            opciones={[
              { valor: "", texto: "Todavía no hay vídeo" },
              ...servicios.map((s) => ({ valor: s.id, texto: s.nombre })),
              { valor: "archivo", texto: "Archivo de vídeo (.mp4)" },
            ]}
          />
          {proveedor ? (
            <CampoAdmin
              key={proveedor}
              etiqueta={
                proveedor === "archivo"
                  ? "Dirección del archivo"
                  : "Dirección o identificador del vídeo"
              }
              name="video"
              defaultValue={proveedor === videoInicial.proveedor ? videoInicial.valor : ""}
              placeholder={servicio?.ejemplo ?? "https://…/video.mp4"}
              error={error("video")}
              ayuda={
                servicio
                  ? `Pega el enlace de ${servicio.nombre} o solo el identificador. Ejemplo: ${servicio.ejemplo}`
                  : "Una dirección https://… o /videos/… que acabe en .mp4 o .webm."
              }
            />
          ) : (
            <p className="self-end pb-2 text-sm text-gris">
              Los alumnos verán el aviso «Estamos grabando este vídeo».
            </p>
          )}
        </div>
      </Caja>

      <div className="flex justify-end gap-2">
        <BotonAdmin href={`/admin/cursos/${cursoId}`} variante="secundario">
          Volver al curso
        </BotonAdmin>
        <BotonAdmin type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : leccion ? "Guardar cambios" : "Crear lección"}
        </BotonAdmin>
      </div>
    </form>
  );
}
