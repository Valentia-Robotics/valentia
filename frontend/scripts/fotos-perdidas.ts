/**
 * QUITA LAS FOTOS DE PERFIL QUE YA NO EXISTEN
 * Antes del 11-11-2026 las fotos de perfil se guardaban en el disco del servidor (/subidas/perfiles/…).
 * En Render ese disco se vacía en cada publicación, así que esas fotos ya no están: quien la subió la
 * seguía viendo por la copia de su navegador, pero los demás no. Este paso las quita de la cuenta
 * (sale la inicial) para que cada uno vea que tiene que volver a subirla.
 *
 * Lo ejecuta el pre-despliegue de Render. Solo cambia algo en Render y si no hay un disco propio
 * (ALMACEN_LOCAL_CARPETA): en local esas fotos siguen en la carpeta subidas/. Se puede repetir.
 */
import "dotenv/config";
import { MongoClient } from "mongodb";

async function main() {
  if (!process.env.RENDER || process.env.ALMACEN_LOCAL_CARPETA?.trim()) {
    console.log("  Nada que hacer (no es Render o hay un disco propio).");
    return;
  }
  const url = process.env.DATABASE_URL ?? "";
  if (!/^mongodb(\+srv)?:\/\//.test(url))
    throw new Error("Falta DATABASE_URL (una dirección de MongoDB).");
  const cliente = new MongoClient(url, { serverSelectionTimeoutMS: 20_000 });
  try {
    const { modifiedCount } = await cliente
      .db()
      .collection("Usuario")
      .updateMany({ foto: { $regex: "^/subidas/perfiles/" } }, { $set: { foto: null } });
    console.log(`  Fotos de perfil perdidas quitadas: ${modifiedCount}`);
  } finally {
    await cliente.close();
  }
}

main().catch((error: unknown) => {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(
    `✖ ${mensaje.replace(/(mongodb(?:\+srv)?:\/\/[^:@/\s]*)(?::[^@\s]*)?@/gi, "$1:***@")}`,
  );
  process.exit(1);
});
