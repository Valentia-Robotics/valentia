/**
 * COPIA DE SEGURIDAD DE LA BASE DE DATOS (MongoDB)
 * El plan gratuito M0 de Atlas no hace copias automáticas: este script guarda TODAS las colecciones
 * en un archivo de la carpeta copias/ (fuera de git: tiene datos personales de los clientes).
 *
 * Usa formato EJSON, que conserva los tipos exactos (fechas, ObjectId…), así que la copia se
 * restaura tal cual con "npm run db:restaurar".
 *
 * Uso:  npm run db:copia
 *   Copia la base de datos de DATABASE_URL. Para copiar la de producción desde tu ordenador,
 *   ver README «Copias de seguridad».
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BSON, MongoClient } from "mongodb";

const { EJSON } = BSON;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("mongodb")) throw new Error("DATABASE_URL no es una dirección de MongoDB.");

  const cliente = new MongoClient(url);
  try {
    const bd = cliente.db(); // la base de datos que indica la dirección
    const colecciones = (await bd.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((nombre) => !nombre.startsWith("system."))
      .sort();

    const copia: Record<string, unknown[]> = {};
    let documentos = 0;
    for (const nombre of colecciones) {
      copia[nombre] = await bd.collection(nombre).find().toArray();
      documentos += copia[nombre].length;
    }

    // Fecha y hora locales en el nombre: valentia_2026-10-19_13-05.json
    const fecha = new Date()
      .toLocaleString("sv-SE")
      .slice(0, 16)
      .replace(" ", "_")
      .replace(":", "-");
    const carpeta = path.join(process.cwd(), "copias");
    const archivo = path.join(carpeta, `${bd.databaseName}_${fecha}.json`);
    await mkdir(carpeta, { recursive: true });
    await writeFile(
      archivo,
      EJSON.stringify(
        { baseDeDatos: bd.databaseName, creadaEn: new Date(), colecciones: copia },
        { relaxed: false },
      ),
    );

    console.log(
      `✔ Copia de "${bd.databaseName}": ${colecciones.length} colecciones, ${documentos} documentos.`,
    );
    console.log(`  Guardada en ${path.relative(process.cwd(), archivo)}`);
    console.log(
      "  Guárdala también fuera de este ordenador (tiene datos personales: en un sitio privado).",
    );
  } finally {
    await cliente.close();
  }
}

main().catch((error: unknown) => {
  console.error("✖ No se pudo hacer la copia de seguridad.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
