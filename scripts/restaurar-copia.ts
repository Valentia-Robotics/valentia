/**
 * RESTAURAR UNA COPIA DE SEGURIDAD (hecha con "npm run db:copia")
 * Vuelve a cargar todas las colecciones de la copia en la base de datos de DATABASE_URL.
 *
 * Es una operación delicada, así que:
 *   - sin --si solo enseña lo que haría (no cambia nada);
 *   - si la base de datos ya tiene datos, hay que añadir también --reemplazar: entonces BORRA lo que
 *     haya en cada colección de la copia y pone los documentos de la copia.
 * Los índices no se tocan (los crea "npm run db:push"; si la base de datos es nueva, ejecútalo antes).
 *
 * Uso:  npm run db:restaurar -- copias/archivo.json                    (solo enseña qué haría)
 *       npm run db:restaurar -- copias/archivo.json --si               (base de datos vacía)
 *       npm run db:restaurar -- copias/archivo.json --si --reemplazar  (sustituye lo que haya)
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { BSON, MongoClient, type Document } from "mongodb";

const { EJSON } = BSON;

interface Copia {
  baseDeDatos: string;
  creadaEn: Date;
  colecciones: Record<string, Document[]>;
}

async function main() {
  const argumentos = process.argv.slice(2);
  const archivo = argumentos.find((a) => !a.startsWith("--"));
  const confirmar = argumentos.includes("--si");
  const reemplazar = argumentos.includes("--reemplazar");
  if (!archivo) throw new Error("Uso: npm run db:restaurar -- copias/archivo.json [--si] [--reemplazar]");

  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("mongodb")) throw new Error("DATABASE_URL no es una dirección de MongoDB.");

  const copia = EJSON.parse(await readFile(archivo, "utf8"), { relaxed: false }) as Copia;
  if (!copia?.colecciones) throw new Error(`${archivo} no parece una copia hecha con "npm run db:copia".`);

  const cliente = new MongoClient(url);
  try {
    const bd = cliente.db();
    console.log(`Copia de "${copia.baseDeDatos}" del ${copia.creadaEn.toLocaleString("es-ES")}`);
    console.log(`Destino: base de datos "${bd.databaseName}"\n`);

    let ocupadas = 0;
    for (const [nombre, documentos] of Object.entries(copia.colecciones)) {
      const actuales = await bd.collection(nombre).countDocuments();
      if (actuales > 0) ocupadas++;
      console.log(`  ${nombre}: ${documentos.length} en la copia · ${actuales} ahora`);
    }

    if (!confirmar) {
      console.log("\nNo se ha cambiado nada. Para restaurar de verdad, añade --si.");
      return;
    }
    if (ocupadas > 0 && !reemplazar) {
      console.log(
        "\n✖ La base de datos de destino ya tiene datos. Si quieres SUSTITUIRLOS por la copia, añade --reemplazar.",
      );
      process.exitCode = 1;
      return;
    }

    for (const [nombre, documentos] of Object.entries(copia.colecciones)) {
      const coleccion = bd.collection(nombre);
      await coleccion.deleteMany({});
      if (documentos.length > 0) await coleccion.insertMany(documentos, { ordered: true });
    }
    console.log("\n✔ Copia restaurada.");
  } finally {
    await cliente.close();
  }
}

main().catch((error: unknown) => {
  console.error("✖ No se pudo restaurar la copia.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
