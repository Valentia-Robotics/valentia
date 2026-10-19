/**
 * Leer y escribir el catálogo exportado (data/catalogo/<Coleccion>.json).
 * Formato EJSON canónico: conserva los tipos exactos de MongoDB (ObjectId, enteros, decimales…),
 * así los ids y las relaciones llegan iguales a producción.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BSON } from "mongodb";
import { COLECCIONES_CATALOGO, type Catalogo, type Doc } from "../src/lib/catalogoProduccion";

const { EJSON } = BSON;

export const CARPETA_CATALOGO = path.join("data", "catalogo");

export async function escribirCatalogo(catalogo: Catalogo): Promise<void> {
  await mkdir(CARPETA_CATALOGO, { recursive: true });
  for (const coleccion of COLECCIONES_CATALOGO) {
    // Ordenadas por id: así git solo enseña lo que cambia de verdad
    const docs = [...catalogo[coleccion]].sort((a, b) =>
      String(a._id).localeCompare(String(b._id)),
    );
    await writeFile(
      path.join(CARPETA_CATALOGO, `${coleccion}.json`),
      `${EJSON.stringify(docs, undefined, 2, { relaxed: false })}\n`,
    );
  }
}

export async function leerCatalogo(): Promise<Catalogo> {
  const catalogo = {} as Catalogo;
  for (const coleccion of COLECCIONES_CATALOGO) {
    const archivo = path.join(CARPETA_CATALOGO, `${coleccion}.json`);
    const texto = await readFile(archivo, "utf8").catch(() => {
      throw new Error(
        `Falta ${archivo}. Ejecuta antes «npm run catalogo:exportar» en tu ordenador.`,
      );
    });
    catalogo[coleccion] = EJSON.parse(texto, { relaxed: false }) as Doc[];
  }
  return catalogo;
}
