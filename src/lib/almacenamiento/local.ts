/**
 * ALMACÉN LOCAL: guarda los archivos en la carpeta "subidas/" del proyecto
 * (fuera de git) y la web los sirve en /subidas/… (ver src/app/subidas/[...ruta]/route.ts).
 * Sirve para trabajar en local o en un servidor propio con disco.
 */
import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Almacen } from "./tipos";

/** Carpeta donde se guardan (se puede cambiar con ALMACEN_LOCAL_CARPETA en .env) */
const CARPETA_SUBIDAS = path.resolve(process.env.ALMACEN_LOCAL_CARPETA ?? "subidas");
/** Dirección pública de la carpeta */
const PREFIJO_URL = "/subidas/";

/**
 * Convierte una ruta relativa ("componentes/abc.webp") en la ruta del disco,
 * comprobando que no se sale de la carpeta (nadie puede pedir "../.env").
 */
function rutaEnDisco(relativa: string): string | null {
  const completa = path.resolve(CARPETA_SUBIDAS, relativa);
  return completa.startsWith(CARPETA_SUBIDAS + path.sep) ? completa : null;
}

export const almacenLocal: Almacen = {
  async guardar(ruta, datos) {
    const destino = rutaEnDisco(ruta);
    if (!destino) throw new Error("Ruta de archivo no válida");
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, datos);
    return PREFIJO_URL + ruta;
  },

  async borrar(url) {
    if (!url.startsWith(PREFIJO_URL)) return; // no es una subida (por ejemplo, /images/…)
    const destino = rutaEnDisco(url.slice(PREFIJO_URL.length));
    if (destino) await unlink(destino).catch(() => {}); // si ya no existe, no pasa nada
  },
};

/** Lee un archivo subido (lo usa la ruta /subidas/…). null si la ruta no es válida. */
export function leerSubida(relativa: string): Promise<Buffer> | null {
  const destino = rutaEnDisco(relativa);
  return destino ? readFile(destino) : null;
}
