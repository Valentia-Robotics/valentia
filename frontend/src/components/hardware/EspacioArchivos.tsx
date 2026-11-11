import { Fragment } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Download, FileText, Folder, HardDrive } from "lucide-react";
import { borrarArchivoHardware, borrarCarpetaHardware } from "@/app/hardware/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Caja } from "@/components/admin/Caja";
import { Tabla } from "@/components/admin/Tabla";
import {
  CUOTA_BYTES_PERSONA,
  limpiarCarpeta,
  migasDeCarpeta,
  tamanoLegible,
  verCarpeta,
} from "@/config/hardware";
import { fechaHora } from "@/lib/admin/formato";
import { almacenPrivadoListo } from "@/lib/almacenamiento/privado";
import { verEspacio } from "@/lib/hardware/archivos";
import { cn } from "@/lib/utils";
import { NuevaCarpeta } from "./NuevaCarpeta";
import { SubirArchivos } from "./SubirArchivos";

/**
 * El espacio de archivos de una persona de hardware: lo que ocupa, el botón de subir y la lista por
 * carpetas. Sirve igual para su dueño (/hardware) y para el admin (/admin/hardware/<id>).
 *   duenoId     → de quién es el espacio
 *   paraAdmin   → lo ve un administrador (sube al espacio de otra persona)
 *   puedeSubir  → false si la persona ya no es de hardware (solo se puede descargar y borrar)
 *   pagina      → dirección de la página ("/hardware" o "/admin/hardware/<id>")
 *   carpeta     → la carpeta abierta (?carpeta= de la dirección; "" = la principal)
 * La lista funciona como el explorador del ordenador: se entra en las carpetas pulsándolas.
 */
export async function EspacioArchivos({
  duenoId,
  paraAdmin = false,
  puedeSubir = true,
  pagina,
  carpeta = "",
}: {
  duenoId: string;
  paraAdmin?: boolean;
  puedeSubir?: boolean;
  pagina: string;
  carpeta?: string;
}) {
  const { archivos, usados, carpetas, guardadas } = await verEspacio(duenoId);
  const porcentaje = Math.min(100, Math.round((usados / CUOTA_BYTES_PERSONA) * 100));
  const listo = almacenPrivadoListo();
  // Una carpeta rara en la dirección (a mano o ya borrada) → la principal
  const ruta = limpiarCarpeta(carpeta) ?? "";
  const vista = verCarpeta(archivos, ruta, guardadas);
  const migas = migasDeCarpeta(ruta);
  const enlace = (r: string) => (r ? `${pagina}?${new URLSearchParams({ carpeta: r })}` : pagina);

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
            key={ruta}
            carpetas={carpetas}
            carpetaInicial={ruta}
            libres={Math.max(0, CUOTA_BYTES_PERSONA - usados)}
          />
        )}
      </Caja>

      <Caja sinRelleno>
        {/* Migas de pan, como la barra de direcciones del explorador */}
        <nav
          aria-label="Carpeta actual"
          className="flex flex-wrap items-center gap-1 border-b border-linea px-4 py-3 text-sm sm:px-5"
        >
          {ruta && (
            <Link
              href={enlace(migas.at(-2)?.ruta ?? "")}
              aria-label="Subir un nivel"
              className="mr-1 inline-flex size-7 items-center justify-center rounded-md ring-1 ring-linea hover:bg-niebla"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
            </Link>
          )}
          <Link
            href={enlace("")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-1 font-semibold hover:text-acento",
              !ruta && "text-tinta",
            )}
          >
            <HardDrive aria-hidden="true" className="size-4" />
            Archivos
          </Link>
          {migas.map((m, i) => (
            <Fragment key={m.ruta}>
              <ChevronRight aria-hidden="true" className="size-4 text-gris" />
              {i === migas.length - 1 ? (
                <span aria-current="page" className="px-1 font-semibold break-all">
                  {m.nombre}
                </span>
              ) : (
                <Link href={enlace(m.ruta)} className="rounded px-1 break-all hover:text-acento">
                  {m.nombre}
                </Link>
              )}
            </Fragment>
          ))}
          <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-gris tabular-nums">
            {puedeSubir && (
              <NuevaCarpeta duenoId={paraAdmin ? duenoId : undefined} dentro={ruta} key={ruta} />
            )}
            <span>
              {archivos.length === 1
                ? "1 archivo en total"
                : `${archivos.length} archivos en total`}
            </span>
          </span>
        </nav>
        <Tabla
          columnas={["Nombre", "Tamaño", "Subido", ""]}
          etiqueta="Archivos"
          vacia={
            vista.carpetas.length === 0 &&
            vista.archivos.length === 0 &&
            (ruta ? (
              <>
                Esta carpeta está vacía.{" "}
                <Link href={enlace("")} className="underline">
                  Volver al principio
                </Link>
              </>
            ) : (
              "Todavía no hay ningún archivo."
            ))
          }
        >
          {vista.carpetas.map((c) => (
            <tr key={c.ruta} className="hover:bg-niebla/60">
              <td className="max-w-xs break-words">
                <Link
                  href={enlace(c.ruta)}
                  className="inline-flex items-center gap-2 font-medium hover:text-acento hover:underline"
                >
                  <Folder aria-hidden="true" className="size-4 shrink-0 fill-aviso/20 text-aviso" />
                  {c.nombre}
                </Link>
              </td>
              <td className="whitespace-nowrap text-gris tabular-nums">{tamanoLegible(c.bytes)}</td>
              <td className="text-gris">
                {c.archivos === 0
                  ? "Vacía"
                  : c.archivos === 1
                    ? "1 archivo"
                    : `${c.archivos} archivos`}
              </td>
              <td>
                {c.archivos === 0 && (
                  <div className="flex justify-end">
                    <BotonConfirmar
                      accion={borrarCarpetaHardware}
                      datos={{ ruta: c.ruta, duenoId }}
                      titulo="Borrar carpeta"
                      texto={`La carpeta «${c.nombre}» está vacía y se borrará (con sus subcarpetas vacías).`}
                      variante="peligro"
                      pequeno
                    >
                      Borrar
                    </BotonConfirmar>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {vista.archivos.map((a) => (
            <tr key={a.id}>
              <td className="max-w-xs break-words">
                <a
                  href={`/api/hardware/archivos/${a.id}`}
                  className="inline-flex items-center gap-2 font-medium hover:text-acento hover:underline"
                  download
                >
                  <FileText aria-hidden="true" className="size-4 shrink-0 text-gris" />
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
          ))}
        </Tabla>
      </Caja>
    </div>
  );
}
