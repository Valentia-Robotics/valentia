/**
 * Prepara la base de datos de las pruebas de extremo a extremo: "valentia_e2e", en el mismo clúster
 * de MongoDB que DATABASE_URL pero APARTE. Las pruebas nunca tocan tu base de datos de desarrollo.
 *   1. Borra valentia_e2e y la crea de nuevo (colecciones e índices) con los datos de prueba (seed).
 *   2. Pone en la primera lección del coche un vídeo de archivo (para probar que el test
 *      se desbloquea al terminar el vídeo).
 * Lo ejecuta Playwright antes de arrancar la web (ver playwright.config.ts).
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { MongoClient } from "mongodb";

/** La misma dirección que DATABASE_URL, pero con la base de datos de las pruebas (igual en playwright.config.ts) */
function urlPruebas(url = process.env.DATABASE_URL ?? "") {
  if (!/^mongodb(\+srv)?:\/\//.test(url)) throw new Error("DATABASE_URL no es una dirección de MongoDB.");
  return url.replace(/^(mongodb(?:\+srv)?:\/\/[^/]+)(\/[^?]*)?/, "$1/valentia_e2e");
}

async function preparar() {
  const url = urlPruebas();
  const cliente = new MongoClient(url);
  try {
    const bd = cliente.db();
    // Por seguridad: solo se borra una base de datos de pruebas
    if (!bd.databaseName.endsWith("_e2e")) throw new Error("La base de datos de pruebas debe acabar en _e2e.");
    await bd.dropDatabase();

    const env = { ...process.env, DATABASE_URL: url };
    execSync("npx prisma db push --skip-generate", { env, stdio: "ignore" });
    execSync("npx prisma db seed", { env, stdio: "inherit" });

    const kit = await bd.collection("Kit").findOne({ slug: "coche-seguidor-de-lineas" });
    await bd
      .collection("Leccion")
      .updateOne({ cursoId: kit.cursoId, orden: 1 }, { $set: { videoUrl: "/e2e/video-de-prueba.mp4" } });
    console.log("✔ Base de datos de pruebas lista:", bd.databaseName);
  } finally {
    await cliente.close();
  }
}

preparar().catch((error) => {
  console.error("✖ No se pudo preparar la base de datos de pruebas:", error.message);
  process.exitCode = 1;
});
