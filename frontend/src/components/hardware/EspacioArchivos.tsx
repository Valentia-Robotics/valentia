import { Fragment } from "react";
import { Download, Folder } from "lucide-react";
import { borrarArchivoHardware } from "@/app/hardware/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Caja } from "@/components/admin/Caja";
import { Tabla } from "@/components/admin/Tabla";
import { CUOTA_BYTES_PERSONA, tamanoLegible } from "@/config/hardware";
import { fechaHora } from "@/lib/admin/formato";
import { almacenPrivadoListo } from "@/lib/almacenamiento/privado";
import { verEspacio } from "@/lib/hardware/archivos";
import { SubirArchivos } from "./SubirArchivos";

/**
 * El espacio de archivos de una persona de hardware: lo que ocupa, el botón de subir y la lista por
 * carpetas. Sirve igual para su dueño (/hardware) y para el admin (/admin/hardware/<id>).
 *   duenoId     → de quién es el espacio
 *   paraAdmin   → lo ve un administrador (sube al espacio de otra persona)
 *   puedeSubir  → false si la persona ya no es de hardware (solo se puede descargar y borrar)
 */
export async function EspacioArchivos({
  duenoId,
  paraAdmin = false,
  puedeSubir = true,
}: {
  duenoId: string;
  paraAdmin?: boolean;
  puedeSubir?: boolean;
}) {
  const { archivos, usados, carpetas } = await verEspacio(duenoId);
  const porcentaje = Math.min(100, Math.round((usados / CUOTA_BYTES_PERSONA) * 100));
  const listo = almacenPrivadoListo();

  return (
    <div className="space-y-6">
      <Caja titulo="Subir archivos">
        <div className="mb-5">
          <div className="mb-1.5 flex justify-between text-xs text-gris tabular-nums">
            <span>Espacio usado</span>
            <span>
              {tamanoLegible(usados)} de {tamanoLegible(CUOTA_BYTES_PERSONA)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={porcentaje}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Espacio usado"
            className="h-1.5 overflow-hidden rounded-full bg-tinta/10"
          >
            <div
              className={porcentaje >= 90 ? "h-full bg-error" : "h-full bg-acento"}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
        {!listo ? (
          <Aviso tipo="info">
            Todavía no se pueden subir archivos: falta configurar el almacén en el servidor
            (ALMACEN_PRIVADO_BUCKET).
          </Aviso>
        ) : !puedeSubir ? (
          <Aviso tipo="info">
            Esta persona ya no es del equipo de hardware: sus archivos se pueden descargar o borrar,
            pero no se suben nuevos.
          </Aviso>
        ) : (
          <SubirArchivos
            duenoId={paraAdmin ? duenoId : undefined}
            carpetas={carpetas}
            libres={Math.max(0, CUOTA_BYTES_PERSONA - usados)}
          />
        )}
      </Caja>

      <Caja titulo={`Archivos (${archivos.length})`} sinRelleno>
        <Tabla
          columnas={["Nombre", "Tamaño", "Subido", ""]}
          vacia={archivos.length === 0 && "Todavía no hay ningún archivo."}
        >
          {archivos.map((a, i) => (
            <Fragment key={a.id}>
              {(i === 0 || archivos[i - 1].carpeta !== a.carpeta) && (
                <tr>
                  <td colSpan={4} className="bg-niebla text-xs font-semibold text-gris">
                    <span className="inline-flex items-center gap-1.5">
                      <Folder aria-hidden="true" className="size-3.5" />
                      {a.carpeta || "Sin carpeta"}
                    </span>
                  </td>
                </tr>
              )}
              <tr>
                <td className="max-w-xs break-words">
                  <a
                    href={`/api/hardware/archivos/${a.id}`}
                    className="font-medium hover:text-acento hover:underline"
                    download
                  >
                    {a.nombre}
                  </a>
                </td>
                <td className="whitespace-nowrap text-gris tabular-nums">
                  {tamanoLegible(a.tamano)}
                </td>
                <td className="text-gris">
                  <span className="whitespace-nowrap">{fechaHora(a.subidoEn)}</span>
                  <span className="block text-xs">por {a.subidoPorNombre}</span>
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <a
                      href={`/api/hardware/archivos/${a.id}`}
                      download
                      aria-label={`Descargar ${a.nombre}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm ring-1 ring-linea hover:bg-niebla"
                    >
                      <Download aria-hidden="true" className="size-4" />
                      <span className="hidden sm:inline">Descargar</span>
                    </a>
                    <BotonConfirmar
                      accion={borrarArchivoHardware}
                      datos={{ archivoId: a.id }}
                      titulo="Borrar archivo"
                      texto={`«${a.nombre}» se borrará para siempre. No se puede deshacer.`}
                      variante="peligro"
                      pequeno
                    >
                      Borrar
                    </BotonConfirmar>
                  </div>
                </td>
              </tr>
            </Fragment>
          ))}
        </Tabla>
      </Caja>
    </div>
  );
}
