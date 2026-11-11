"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { FileUp, FolderUp, Upload, X } from "lucide-react";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { CampoAdmin } from "@/components/admin/campos";
import { crearCarpetasVaciasHardware } from "@/app/hardware/acciones";
import {
  carpetaDeRuta,
  esArchivoDelSistema,
  MAXIMO_ARCHIVOS_CARPETA,
  MAXIMO_ARCHIVOS_DE_GOLPE,
  MAXIMO_BYTES_ARCHIVO,
  MAXIMO_MB_ARCHIVO,
  MAXIMO_NIVELES_CARPETA,
  tamanoLegible,
} from "@/config/hardware";
import { cn } from "@/lib/utils";

/** Un archivo elegido y su ruta dentro de la carpeta elegida ("Coche/PCB/placa.pcb"; suelto = su nombre) */
interface Elegido {
  archivo: File;
  ruta: string;
}

/** Lo que se va a subir: archivos sueltos o una (o varias) carpetas enteras */
interface Seleccion {
  tipo: "archivos" | "carpeta";
  elegidos: Elegido[];
  /**
   * Todas las carpetas de lo elegido ("Coche", "Coche/PCB"…), también las vacías: se guardan para
   * que se vean en el espacio aunque no lleven archivos
   */
  carpetas: string[];
  /** Archivos del sistema que se han dejado fuera (.DS_Store, Thumbs.db…) */
  ignorados: number;
}

/** Errores que se enseñan como mucho (si fallan 300 archivos, la lista no tiene fin) */
const MAXIMO_ERRORES_VISIBLES = 15;

/** Sube un archivo con su barra de progreso (fetch no sabe contar lo que lleva enviado) */
function enviar(
  archivo: File,
  destino: string,
  alAvanzar: (fraccion: number) => void,
): Promise<{ error: string | null; status: number }> {
  return new Promise((resolver) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", destino);
    xhr.setRequestHeader("x-nombre-archivo", encodeURIComponent(archivo.name));
    xhr.setRequestHeader("Content-Type", archivo.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && alAvanzar(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300)
        return resolver({ error: null, status: xhr.status });
      try {
        const error = (JSON.parse(xhr.responseText) as { error?: string }).error;
        resolver({ error: error ?? "No se ha podido subir.", status: xhr.status });
      } catch {
        resolver({ error: `No se ha podido subir (error ${xhr.status}).`, status: xhr.status });
      }
    };
    xhr.onerror = () =>
      resolver({ error: "Se ha cortado la conexión. Vuelve a probar.", status: 0 });
    xhr.send(archivo);
  });
}

/**
 * Lee todo lo que hay dentro de una carpeta arrastrada (el navegador lo da a trozos de 100).
 * Apunta también cada carpeta en `carpetas`, aunque esté vacía.
 */
async function leerEntrada(
  entrada: FileSystemEntry,
  salida: Elegido[],
  carpetas: string[],
): Promise<void> {
  if (entrada.isFile) {
    const archivo = await new Promise<File>((ok, mal) =>
      (entrada as FileSystemFileEntry).file(ok, mal),
    );
    salida.push({ archivo, ruta: entrada.fullPath.replace(/^\/+/, "") });
    return;
  }
  if (!entrada.isDirectory) return;
  carpetas.push(entrada.fullPath.replace(/^\/+/, ""));
  const lector = (entrada as FileSystemDirectoryEntry).createReader();
  for (;;) {
    const trozo = await new Promise<FileSystemEntry[]>((ok, mal) => lector.readEntries(ok, mal));
    if (trozo.length === 0) break;
    for (const hija of trozo) await leerEntrada(hija, salida, carpetas);
  }
}

/** Separa los archivos útiles de los que crea solo el ordenador */
function prepararSeleccion(
  tipo: Seleccion["tipo"],
  todos: Elegido[],
  carpetasVistas: string[] = [],
): Seleccion {
  const elegidos = todos.filter((e) => !esArchivoDelSistema(e.ruta));
  // Las carpetas de la ruta de cada archivo (también de los que no se suben: una carpeta con solo
  // un .DS_Store se ve vacía) y las que ha visto el navegador; sin las ocultas (.git…)
  const carpetas = new Set<string>();
  for (const ruta of [...todos.map((e) => e.ruta), ...carpetasVistas.map((c) => `${c}/x`)]) {
    const partes = ruta.split("/").slice(0, -1);
    for (let i = 1; i <= partes.length; i++) carpetas.add(partes.slice(0, i).join("/"));
  }
  return {
    tipo,
    elegidos,
    carpetas: [...carpetas].filter((c) => c && !esArchivoDelSistema(`${c}/x`)),
    ignorados: todos.length - elegidos.length,
  };
}

/**
 * Suma lo nuevo a lo que ya estaba elegido (el navegador solo deja elegir UNA carpeta cada vez:
 * así se pueden subir «diseños» y «programas» juntas eligiéndolas una detrás de otra).
 * Si un archivo ya estaba (misma ruta), se queda el último elegido.
 */
function juntarSelecciones(antes: Seleccion | null, nueva: Seleccion): Seleccion {
  if (!antes) return nueva;
  const porRuta = new Map(antes.elegidos.map((e) => [e.ruta, e]));
  for (const e of nueva.elegidos) porRuta.set(e.ruta, e);
  return {
    tipo: antes.tipo === "carpeta" || nueva.tipo === "carpeta" ? "carpeta" : "archivos",
    elegidos: [...porRuta.values()],
    carpetas: [...new Set([...antes.carpetas, ...nueva.carpetas])],
    ignorados: antes.ignorados + nueva.ignorados,
  };
}

/**
 * «Subir archivos»: elige archivos sueltos o una carpeta entera (con sus subcarpetas, que se crean
 * igual en el espacio), o arrástralos encima. Se suben uno detrás de otro. `duenoId` solo hace
 * falta cuando sube un administrador al espacio de otra persona; `libres` = bytes que quedan.
 */
export function SubirArchivos({
  duenoId,
  carpetas,
  carpetaInicial = "",
  libres,
}: {
  duenoId?: string;
  carpetas: string[];
  /** La carpeta abierta en el explorador: lo que se suba va ahí salvo que se cambie */
  carpetaInicial?: string;
  libres: number;
}) {
  const router = useRouter();
  const idLista = useId();
  const idArchivos = useId();
  const idCarpeta = useId();
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [encima, setEncima] = useState(false);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [hecho, setHecho] = useState<string | null>(null);
  const subiendo = progreso !== null;

  function elegir(nueva: Seleccion) {
    setErrores([]);
    setHecho(null);
    setSeleccion((antes) => juntarSelecciones(antes, nueva));
  }

  function alElegirArchivos(e: ChangeEvent<HTMLInputElement>) {
    const lista = [...(e.target.files ?? [])].map((archivo) => ({ archivo, ruta: archivo.name }));
    e.target.value = ""; // para poder volver a elegir lo mismo
    if (lista.length > 0) elegir(prepararSeleccion("archivos", lista));
  }

  function alElegirCarpeta(e: ChangeEvent<HTMLInputElement>) {
    const lista = [...(e.target.files ?? [])].map((archivo) => ({
      archivo,
      ruta: archivo.webkitRelativePath || archivo.name,
    }));
    e.target.value = "";
    if (lista.length > 0) elegir(prepararSeleccion("carpeta", lista));
    else setErrores(["Esa carpeta está vacía."]);
  }

  async function alSoltar(e: DragEvent<HTMLFormElement>) {
    e.preventDefault();
    setEncima(false);
    if (subiendo) return;
    // Las entradas hay que pedirlas YA: al terminar el evento el navegador las borra
    const entradas = [...e.dataTransfer.items]
      .filter((item) => item.kind === "file")
      .map((item) => item.webkitGetAsEntry?.())
      .filter((entrada): entrada is FileSystemEntry => Boolean(entrada));
    if (entradas.length === 0) {
      const sueltos = [...e.dataTransfer.files].map((archivo) => ({ archivo, ruta: archivo.name }));
      if (sueltos.length > 0) elegir(prepararSeleccion("archivos", sueltos));
      return;
    }
    const lista: Elegido[] = [];
    const vistas: string[] = [];
    try {
      for (const entrada of entradas) await leerEntrada(entrada, lista, vistas);
    } catch {
      return setErrores(["No se ha podido leer lo que has arrastrado. Prueba con los botones."]);
    }
    if (lista.length === 0 && vistas.length === 0) {
      return setErrores(["Lo que has arrastrado está vacío."]);
    }
    const conCarpeta = entradas.some((entrada) => entrada.isDirectory);
    elegir(prepararSeleccion(conCarpeta ? "carpeta" : "archivos", lista, vistas));
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const base = String(new FormData(evento.currentTarget).get("carpeta") ?? "");
    setErrores([]);
    setHecho(null);
    if (!seleccion || (seleccion.elegidos.length === 0 && seleccion.carpetas.length === 0)) {
      return setErrores(["Elige al menos un archivo o una carpeta."]);
    }
    const { elegidos, tipo } = seleccion;
    const maximo = tipo === "carpeta" ? MAXIMO_ARCHIVOS_CARPETA : MAXIMO_ARCHIVOS_DE_GOLPE;
    if (elegidos.length > maximo) {
      return setErrores([
        tipo === "carpeta"
          ? `La carpeta tiene ${elegidos.length} archivos y se pueden subir como mucho ${maximo} de una vez. Sube sus subcarpetas por separado.`
          : `Como mucho ${maximo} archivos sueltos de una vez. Si están en una carpeta, usa «Elegir carpeta».`,
      ]);
    }
    const total = elegidos.reduce((suma, e) => suma + e.archivo.size, 0);
    if (total > libres) {
      return setErrores([
        `No cabe: lo elegido ocupa ${tamanoLegible(total)} y en el espacio quedan ${tamanoLegible(libres)}.`,
      ]);
    }

    const fallos: string[] = [];
    let subidos = 0;
    for (const [i, { archivo, ruta }] of elegidos.entries()) {
      const prefijo = elegidos.length > 1 ? `(${i + 1} de ${elegidos.length}) ` : "";
      const carpeta = carpetaDeRuta(base, ruta);
      if (carpeta === null) {
        fallos.push(
          `${ruta}: está metido en demasiadas carpetas (máximo ${MAXIMO_NIVELES_CARPETA}).`,
        );
        continue;
      }
      if (archivo.size === 0) {
        fallos.push(`${ruta}: está vacío.`);
        continue;
      }
      if (archivo.size > MAXIMO_BYTES_ARCHIVO) {
        fallos.push(`${ruta}: pesa más de ${MAXIMO_MB_ARCHIVO} MB.`);
        continue;
      }
      const destino = `/api/hardware/archivos?${new URLSearchParams({ carpeta, ...(duenoId && { dueno: duenoId }) })}`;
      setProgreso(`${prefijo}Subiendo ${ruta}…`);
      const { error, status } = await enviar(archivo, destino, (f) =>
        setProgreso(`${prefijo}Subiendo ${ruta}… ${Math.round(f * 100)} %`),
      );
      if (!error) {
        subidos++;
        continue;
      }
      fallos.push(`${ruta}: ${error}`);
      // Sin permiso o demasiadas subidas seguidas: el resto fallaría igual
      if (status === 403 || status === 404 || status === 429) {
        fallos.push(`Se ha parado la subida: faltaban ${elegidos.length - i - 1} archivos.`);
        break;
      }
    }
    // Las carpetas (también las vacías) se guardan para que salgan en el espacio
    let carpetasGuardadas = false;
    const rutasCarpetas = seleccion.carpetas
      .map((c) => carpetaDeRuta(base, `${c}/x`))
      .filter((c): c is string => Boolean(c));
    if (rutasCarpetas.length > 0) {
      setProgreso("Guardando las carpetas…");
      try {
        const { error } = await crearCarpetasVaciasHardware(duenoId ?? "", rutasCarpetas);
        if (error) fallos.push(`Carpetas: ${error}`);
        else carpetasGuardadas = true;
      } catch {
        fallos.push("No se han podido guardar las carpetas vacías. Vuelve a probar.");
      }
    }
    setProgreso(null);
    setErrores(
      fallos.length > MAXIMO_ERRORES_VISIBLES
        ? [
            ...fallos.slice(0, MAXIMO_ERRORES_VISIBLES),
            `…y ${fallos.length - MAXIMO_ERRORES_VISIBLES} más.`,
          ]
        : fallos,
    );
    if (subidos > 0 || carpetasGuardadas) {
      setHecho(
        subidos === 0
          ? "Carpetas creadas."
          : subidos === 1
            ? "Archivo subido."
            : `${subidos} archivos subidos.`,
      );
      setSeleccion(null);
      router.refresh();
    }
  }

  // Las carpetas elegidas (la primera parte de la ruta de los archivos que van en carpeta)
  const raices = [
    ...new Set([
      ...(seleccion?.elegidos ?? [])
        .filter((e) => e.ruta.includes("/"))
        .map((e) => e.ruta.split("/")[0]),
      ...(seleccion?.carpetas ?? []).map((c) => c.split("/")[0]),
    ]),
  ];

  /** Quita de lo elegido una de las carpetas (si se eligió una de más) */
  function quitarCarpeta(raiz: string) {
    setSeleccion((antes) => {
      if (!antes) return null;
      const elegidos = antes.elegidos.filter((e) => !e.ruta.startsWith(`${raiz}/`));
      const carpetas = antes.carpetas.filter((c) => c !== raiz && !c.startsWith(`${raiz}/`));
      return elegidos.length > 0 || carpetas.length > 0 ? { ...antes, elegidos, carpetas } : null;
    });
  }
  const pesoElegido = seleccion?.elegidos.reduce((suma, e) => suma + e.archivo.size, 0) ?? 0;
  const claseBoton =
    "inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors";

  return (
    <form
      onSubmit={alEnviar}
      onDragOver={(e) => {
        e.preventDefault();
        if (!subiendo) setEncima(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEncima(false);
      }}
      onDrop={alSoltar}
      className={cn(
        "-m-2 space-y-4 rounded-lg p-2 transition-colors",
        encima && "bg-acento/5 outline-2 outline-acento outline-dashed",
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 block text-sm font-medium">Qué quieres subir</p>
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={idArchivos}
              className={cn(
                claseBoton,
                "bg-tinta text-white hover:bg-grafito",
                subiendo && "pointer-events-none opacity-50",
              )}
            >
              <FileUp aria-hidden="true" className="size-4" />
              Elegir archivos
            </label>
            <input
              id={idArchivos}
              type="file"
              multiple
              disabled={subiendo}
              onChange={alElegirArchivos}
              className="sr-only"
            />
            <label
              htmlFor={idCarpeta}
              className={cn(
                claseBoton,
                "bg-white text-tinta ring-1 ring-linea hover:ring-tinta/40",
                subiendo && "pointer-events-none opacity-50",
              )}
            >
              <FolderUp aria-hidden="true" className="size-4" />
              Elegir carpeta
            </label>
            <input
              id={idCarpeta}
              type="file"
              // El navegador deja elegir una carpeta entera (con sus subcarpetas) con este atributo
              ref={(el) => el?.setAttribute("webkitdirectory", "")}
              disabled={subiendo}
              onChange={alElegirCarpeta}
              className="sr-only"
            />
          </div>
          <p className="mt-1.5 text-xs text-gris">
            También puedes arrastrar archivos o carpetas aquí. Hasta {MAXIMO_MB_ARCHIVO} MB cada
            archivo; una carpeta se sube con todas sus subcarpetas (hasta {MAXIMO_ARCHIVOS_CARPETA}{" "}
            archivos). Para subir varias carpetas, elígelas una detrás de otra: se van sumando. Las
            carpetas vacías solo llegan si las arrastras (el botón se las salta) o con «Nueva
            carpeta».
          </p>
        </div>
        <div>
          <CampoAdmin
            etiqueta="Guardar dentro de la carpeta (opcional)"
            name="carpeta"
            defaultValue={carpetaInicial}
            list={idLista}
            placeholder="Por ejemplo: Coche VR1/PCB"
            maxLength={250}
            disabled={subiendo}
            ayuda="Escribe una nueva o elige una que ya exista. Usa / para meter una dentro de otra. Si subes una carpeta, se crea dentro de esta."
          />
          <datalist id={idLista}>
            {carpetas.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      {seleccion && (
        <div className="flex items-start justify-between gap-3 rounded-md bg-tinta/5 px-3 py-2 text-sm">
          <div className="min-w-0 break-words">
            {raices.length > 0 && (
              <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
                {raices.length === 1 ? "Carpeta" : `${raices.length} carpetas`}
                {raices.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 font-semibold ring-1 ring-linea"
                  >
                    {r}
                    {!subiendo && raices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarCarpeta(r)}
                        className="rounded text-gris hover:text-tinta"
                        aria-label={`Quitar la carpeta ${r}`}
                      >
                        <X aria-hidden="true" className="size-3.5" />
                      </button>
                    )}
                  </span>
                ))}
              </span>
            )}
            {seleccion.elegidos.length === 1
              ? "1 archivo"
              : `${seleccion.elegidos.length} archivos`}{" "}
            ({tamanoLegible(pesoElegido)})
            {seleccion.ignorados > 0 && (
              <span className="text-gris">
                {" "}
                · {seleccion.ignorados} del sistema que no se suben (.DS_Store, Thumbs.db…)
              </span>
            )}
          </div>
          {!subiendo && (
            <button
              type="button"
              onClick={() => setSeleccion(null)}
              className="shrink-0 rounded p-0.5 text-gris hover:bg-tinta/10 hover:text-tinta"
              aria-label="Quitar lo elegido"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <BotonAdmin type="submit" disabled={subiendo}>
          <Upload aria-hidden="true" className="size-4" />
          {subiendo ? "Subiendo…" : "Subir"}
        </BotonAdmin>
        {progreso && (
          <p role="status" className="min-w-0 text-sm break-all text-gris tabular-nums">
            {progreso}
          </p>
        )}
      </div>
      {hecho && <Aviso tipo="exito">{hecho}</Aviso>}
      {errores.length > 0 && (
        <Aviso tipo="error">
          <ul className="space-y-1">
            {errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Aviso>
      )}
    </form>
  );
}
