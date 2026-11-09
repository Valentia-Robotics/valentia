"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { Upload } from "lucide-react";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { CampoAdmin } from "@/components/admin/campos";
import {
  MAXIMO_ARCHIVOS_DE_GOLPE,
  MAXIMO_BYTES_ARCHIVO,
  MAXIMO_MB_ARCHIVO,
} from "@/config/hardware";

/** Sube un archivo con su barra de progreso (fetch no sabe contar lo que lleva enviado) */
function enviar(
  archivo: File,
  destino: string,
  alAvanzar: (fraccion: number) => void,
): Promise<string | null> {
  return new Promise((resolver) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", destino);
    xhr.setRequestHeader("x-nombre-archivo", encodeURIComponent(archivo.name));
    xhr.setRequestHeader("Content-Type", archivo.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && alAvanzar(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolver(null);
      try {
        resolver(
          (JSON.parse(xhr.responseText) as { error?: string }).error ?? "No se ha podido subir.",
        );
      } catch {
        resolver(`No se ha podido subir (error ${xhr.status}).`);
      }
    };
    xhr.onerror = () => resolver("Se ha cortado la conexión. Vuelve a probar.");
    xhr.send(archivo);
  });
}

/**
 * «Subir archivos»: elige uno o varios archivos (y, si quieres, una carpeta) y los sube uno detrás
 * de otro. `duenoId` solo hace falta cuando sube un administrador al espacio de otra persona.
 */
export function SubirArchivos({ duenoId, carpetas }: { duenoId?: string; carpetas: string[] }) {
  const router = useRouter();
  const idLista = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [hecho, setHecho] = useState<string | null>(null);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const archivos = datos
      .getAll("archivos")
      .filter((a): a is File => a instanceof File && a.size > 0);
    const carpeta = String(datos.get("carpeta") ?? "");
    setErrores([]);
    setHecho(null);
    if (archivos.length === 0) return setErrores(["Elige al menos un archivo."]);
    if (archivos.length > MAXIMO_ARCHIVOS_DE_GOLPE) {
      return setErrores([`Como mucho ${MAXIMO_ARCHIVOS_DE_GOLPE} archivos de una vez.`]);
    }

    const destino = `/api/hardware/archivos?${new URLSearchParams({ carpeta, ...(duenoId && { dueno: duenoId }) })}`;
    const fallos: string[] = [];
    let subidos = 0;
    for (const [i, archivo] of archivos.entries()) {
      const prefijo = archivos.length > 1 ? `(${i + 1} de ${archivos.length}) ` : "";
      if (archivo.size > MAXIMO_BYTES_ARCHIVO) {
        fallos.push(`${archivo.name}: pesa más de ${MAXIMO_MB_ARCHIVO} MB.`);
        continue;
      }
      setProgreso(`${prefijo}Subiendo ${archivo.name}…`);
      const error = await enviar(archivo, destino, (f) =>
        setProgreso(`${prefijo}Subiendo ${archivo.name}… ${Math.round(f * 100)} %`),
      );
      if (error) fallos.push(`${archivo.name}: ${error}`);
      else subidos++;
    }
    setProgreso(null);
    setErrores(fallos);
    if (subidos > 0) {
      setHecho(subidos === 1 ? "Archivo subido." : `${subidos} archivos subidos.`);
      formulario.current?.reset();
      router.refresh();
    }
  }

  const subiendo = progreso !== null;
  return (
    <form ref={formulario} onSubmit={alEnviar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="archivos-hardware" className="mb-1.5 block text-sm font-medium">
            Archivos
          </label>
          <input
            id="archivos-hardware"
            name="archivos"
            type="file"
            multiple
            disabled={subiendo}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-tinta file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-grafito"
          />
          <p className="mt-1 text-xs text-gris">
            Cualquier tipo de archivo, hasta {MAXIMO_MB_ARCHIVO} MB cada uno.
          </p>
        </div>
        <div>
          <CampoAdmin
            etiqueta="Carpeta (opcional)"
            name="carpeta"
            list={idLista}
            placeholder="Por ejemplo: Coche VR1/PCB"
            maxLength={250}
            disabled={subiendo}
            ayuda="Escribe una nueva o elige una que ya exista. Usa / para meter una dentro de otra."
          />
          <datalist id={idLista}>
            {carpetas.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <BotonAdmin type="submit" disabled={subiendo}>
          <Upload aria-hidden="true" className="size-4" />
          {subiendo ? "Subiendo…" : "Subir archivos"}
        </BotonAdmin>
        {progreso && (
          <p role="status" className="text-sm text-gris tabular-nums">
            {progreso}
          </p>
        )}
      </div>
      {hecho && <Aviso tipo="exito">{hecho}</Aviso>}
      {errores.length > 0 && (
        <Aviso tipo="error">
          <ul className="space-y-1">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Aviso>
      )}
    </form>
  );
}
