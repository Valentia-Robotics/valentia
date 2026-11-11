/**
 * SUBIR UN ARCHIVO A R2 / S3 CON SU TAMAÑO (Content-Length)
 * aws4fetch mete el cuerpo en un `Request` y, dentro de Next.js, ese cuerpo sale «a trozos»
 * (Transfer-Encoding: chunked), sin decir cuánto ocupa. Cloudflare R2 lo rechaza con un 411
 * (Length Required). Aquí se firma la petición con aws4fetch y se envía con el cuerpo tal cual y
 * su Content-Length: así llega entera, con su tamaño.
 */
import "server-only";
import type { AwsClient } from "aws4fetch";

export async function subirConTamano(
  cliente: AwsClient,
  url: string,
  datos: Buffer,
  cabeceras: Record<string, string>,
): Promise<Response> {
  const cuerpo = new Uint8Array(datos);
  const firmada = await cliente.sign(url, {
    method: "PUT",
    body: cuerpo,
    headers: { ...cabeceras, "Content-Length": String(cuerpo.byteLength) },
  });
  const headers = new Headers(firmada.headers);
  headers.set("Content-Length", String(cuerpo.byteLength));
  return fetch(firmada.url, { method: "PUT", headers, body: cuerpo, cache: "no-store" });
}
