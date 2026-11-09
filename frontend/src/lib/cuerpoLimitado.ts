/**
 * LEER EL CUERPO DE UNA PETICIÓN CON TOPE
 * request.text() y request.json() guardan en memoria todo lo que llegue, sea cuanto sea: en una ruta
 * pública, alguien podría agotar la memoria del servidor enviando un cuerpo enorme.
 * Esto corta la lectura en cuanto se pasa del máximo, aunque la petición no diga cuánto ocupa.
 */

/** Devuelve el texto recibido, o null si ocupa más de `maximo` bytes */
export async function leerCuerpo(peticion: Request, maximo: number): Promise<string | null> {
  const datos = await leerBytes(peticion, maximo);
  return datos === null ? null : datos.toString("utf8");
}

/** Lo mismo, pero con el contenido tal cual (archivos) */
export async function leerBytes(peticion: Request, maximo: number): Promise<Buffer | null> {
  if (Number(peticion.headers.get("content-length") ?? 0) > maximo) return null;
  if (!peticion.body) return Buffer.alloc(0);

  const lector = peticion.body.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximo) {
      await lector.cancel();
      return null;
    }
    trozos.push(value);
  }
  return Buffer.concat(trozos);
}
