/**
 * ALMACÉN PRIVADO (archivos del equipo de hardware)
 * Al contrario que las fotos, estos archivos NUNCA tienen una dirección pública: solo se leen desde
 * el servidor, después de comprobar quién los pide (src/lib/hardware/archivos.ts).
 *
 *   - Con ALMACEN_PRIVADO_BUCKET → un bucket PRIVADO de Cloudflare R2 (o S3), con las mismas
 *     ALMACEN_ENDPOINT, ALMACEN_CLAVE_ID y ALMACEN_CLAVE_SECRETA que las fotos.
 *   - Sin él → la carpeta archivos-privados/ del proyecto (fuera de git; ninguna ruta la sirve).
 *     Solo para trabajar en local: en Render el disco se borra en cada publicación, así que allí
 *     sin bucket no se deja subir nada.
 */
import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";

/** Error con un mensaje que se puede enseñar tal cual */
export class ErrorAlmacenPrivado extends Error {}

const CARPETA_LOCAL = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  process.env.ALMACEN_PRIVADO_CARPETA ?? "archivos-privados",
);

function enLaNube() {
  return Boolean(process.env.ALMACEN_PRIVADO_BUCKET?.trim());
}

/**
 * ¿Se pueden subir archivos? En Render, solo con el bucket, o con ALMACEN_PRIVADO_CARPETA puesta a
 * mano (un Disk de Render, que no se borra al publicar)
 */
export function almacenPrivadoListo(): boolean {
  return enLaNube() || !process.env.RENDER || Boolean(process.env.ALMACEN_PRIVADO_CARPETA);
}

/* ---------- Nube (R2 / S3) ---------- */

let cliente: AwsClient | null = null;

function nube() {
  const leer = (nombre: string) => {
    const valor = process.env[nombre]?.trim();
    if (!valor) throw new ErrorAlmacenPrivado(`Falta ${nombre} en la configuración del servidor.`);
    return valor;
  };
  const endpoint = leer("ALMACEN_ENDPOINT").replace(/\/$/, "");
  const bucket = leer("ALMACEN_PRIVADO_BUCKET");
  cliente ??= new AwsClient({
    accessKeyId: leer("ALMACEN_CLAVE_ID"),
    secretAccessKey: leer("ALMACEN_CLAVE_SECRETA"),
    service: "s3",
    region: process.env.ALMACEN_REGION?.trim() || "auto",
  });
  const url = (clave: string) =>
    `${endpoint}/${encodeURIComponent(bucket)}/${clave.split("/").map(encodeURIComponent).join("/")}`;
  return { cliente, url };
}

/* ---------- Local ---------- */

/** Ruta en el disco, comprobando que no se sale de la carpeta (nadie puede pedir "../.env") */
function enDisco(clave: string): string {
  const completa = path.resolve(/* turbopackIgnore: true */ CARPETA_LOCAL, clave);
  if (!completa.startsWith(CARPETA_LOCAL + path.sep)) {
    throw new ErrorAlmacenPrivado("Ruta de archivo no válida.");
  }
  return completa;
}

/* ---------- Lo que usa el resto de la web ---------- */

export async function guardarPrivado(clave: string, datos: Buffer, tipo: string): Promise<void> {
  if (!almacenPrivadoListo()) {
    throw new ErrorAlmacenPrivado(
      "Todavía no se pueden subir archivos: falta configurar el almacén (ALMACEN_PRIVADO_BUCKET).",
    );
  }
  if (enLaNube()) {
    const { cliente, url } = nube();
    const respuesta = await cliente.fetch(url(clave), {
      method: "PUT",
      body: new Uint8Array(datos),
      headers: { "Content-Type": tipo },
    });
    if (!respuesta.ok) {
      throw new ErrorAlmacenPrivado(`El almacén ha rechazado el archivo (${respuesta.status}).`);
    }
    return;
  }
  const destino = enDisco(clave);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, datos);
}

/** El contenido del archivo para mandarlo al navegador, o null si ya no está */
export async function leerPrivado(clave: string): Promise<ReadableStream<Uint8Array> | null> {
  if (enLaNube()) {
    const { cliente, url } = nube();
    const respuesta = await cliente.fetch(url(clave));
    if (respuesta.status === 404) return null;
    if (!respuesta.ok || !respuesta.body) {
      throw new ErrorAlmacenPrivado(`El almacén no ha devuelto el archivo (${respuesta.status}).`);
    }
    return respuesta.body;
  }
  try {
    const datos = await readFile(enDisco(clave));
    return new Blob([new Uint8Array(datos)]).stream();
  } catch {
    return null;
  }
}

export async function borrarPrivado(clave: string): Promise<void> {
  if (enLaNube()) {
    const { cliente, url } = nube();
    const respuesta = await cliente.fetch(url(clave), { method: "DELETE" });
    if (!respuesta.ok && respuesta.status !== 404) {
      throw new ErrorAlmacenPrivado(`El almacén no ha borrado el archivo (${respuesta.status}).`);
    }
    return;
  }
  await unlink(enDisco(clave)).catch(() => {}); // si ya no existe, no pasa nada
}
