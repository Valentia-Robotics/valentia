/**
 * ALMACÉN EN LA NUBE (preparado, todavía sin activar)
 * Cuando se publique la web, las fotos deberían guardarse en un servicio como
 * Amazon S3, Cloudflare R2 o Cloudinary: el disco de muchos servidores se borra en cada despliegue.
 *
 * Pasos para activarlo (ejemplo con S3 o R2, que usan la misma librería):
 *   1. npm install @aws-sdk/client-s3
 *   2. En .env:  ALMACEN_PROVEEDOR="nube"  y las claves (ALMACEN_BUCKET, ALMACEN_REGION,
 *      ALMACEN_CLAVE_ID, ALMACEN_CLAVE_SECRETA, ALMACEN_URL_PUBLICA).
 *   3. Rellena "guardar" con PutObjectCommand (devolviendo ALMACEN_URL_PUBLICA + ruta)
 *      y "borrar" con DeleteObjectCommand.
 *   4. Las imágenes se muestran sin optimizar (unoptimized), así que next.config.ts no cambia.
 * Las fotos ya subidas en local se pueden copiar al bucket con la misma ruta.
 */
import "server-only";
import type { Almacen } from "./tipos";

export const almacenNube: Almacen = {
  async guardar() {
    throw new Error(
      "El almacén en la nube aún no está configurado. Mira src/lib/almacenamiento/nube.ts.",
    );
  },
  async borrar() {
    // Sin configurar: no hay nada que borrar
  },
};
