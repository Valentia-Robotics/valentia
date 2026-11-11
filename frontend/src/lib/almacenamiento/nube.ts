/**
 * ALMACÉN EN LA NUBE (compatible con S3)
 * Para la web publicada: el disco de muchos servidores se borra en cada despliegue, así que
 * las fotos se guardan en un servicio como Cloudflare R2, Amazon S3, Backblaze B2 o MinIO
 * (todos hablan el mismo "idioma", el de S3).
 *
 * Se activa SOLO con la configuración (.env), sin tocar código:
 *   ALMACEN_PROVEEDOR="nube"
 *   ALMACEN_ENDPOINT="https://<cuenta>.r2.cloudflarestorage.com"   (o https://s3.eu-west-1.amazonaws.com)
 *   ALMACEN_REGION="auto"                (R2: auto · S3: la región, por ejemplo eu-west-1)
 *   ALMACEN_BUCKET="valentia-fotos"
 *   ALMACEN_CLAVE_ID="…"   ALMACEN_CLAVE_SECRETA="…"   (claves con permiso solo para ese bucket)
 *   ALMACEN_URL_PUBLICA="https://fotos.valentiarobotics.com"   (dirección pública del bucket)
 * Las fotos que ya tengas en subidas/ se copian al bucket con la misma ruta (ver README).
 */
import "server-only";
import { AwsClient } from "aws4fetch";
import { subirConTamano } from "./subirS3";
import type { Almacen } from "./tipos";

function configuracion() {
  const leer = (nombre: string) => {
    const valor = process.env[nombre]?.trim();
    if (!valor) {
      throw new Error(`Falta ${nombre} en .env para guardar las fotos en la nube (ver README).`);
    }
    return valor;
  };
  return {
    endpoint: leer("ALMACEN_ENDPOINT").replace(/\/$/, ""),
    region: process.env.ALMACEN_REGION?.trim() || "auto",
    bucket: leer("ALMACEN_BUCKET"),
    claveId: leer("ALMACEN_CLAVE_ID"),
    claveSecreta: leer("ALMACEN_CLAVE_SECRETA"),
    urlPublica: leer("ALMACEN_URL_PUBLICA").replace(/\/$/, ""),
  };
}

let cliente: AwsClient | null = null;

function conexion() {
  const c = configuracion();
  cliente ??= new AwsClient({
    accessKeyId: c.claveId,
    secretAccessKey: c.claveSecreta,
    service: "s3",
    region: c.region,
  });
  return { c, cliente };
}

/** Dirección del archivo dentro del bucket (formato "path-style", vale en todos los servicios) */
function urlObjeto(c: ReturnType<typeof configuracion>, ruta: string) {
  const segura = ruta.split("/").map(encodeURIComponent).join("/");
  return `${c.endpoint}/${encodeURIComponent(c.bucket)}/${segura}`;
}

export const almacenNube: Almacen = {
  async guardar(ruta, datos, tipoContenido) {
    const { c, cliente } = conexion();
    const respuesta = await subirConTamano(cliente, urlObjeto(c, ruta), datos, {
      "Content-Type": tipoContenido,
      // El nombre de cada foto es único: el navegador puede guardarla para siempre
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    if (!respuesta.ok) {
      throw new Error(`El almacén en la nube ha rechazado la foto (${respuesta.status}).`);
    }
    return `${c.urlPublica}/${ruta}`;
  },

  async borrar(url) {
    const { c, cliente } = conexion();
    if (!url.startsWith(`${c.urlPublica}/`)) return; // no es una foto de este almacén
    const ruta = url.slice(c.urlPublica.length + 1);
    const respuesta = await cliente.fetch(urlObjeto(c, ruta), { method: "DELETE" });
    if (!respuesta.ok && respuesta.status !== 404) {
      console.error(`No se ha podido borrar ${url} del almacén (${respuesta.status}).`);
    }
  },
};
