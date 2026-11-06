/**
 * COMPROBAR LA CONEXIÓN CON MONGODB
 * Pensado para la Shell de Render (o tu ordenador) cuando la web no conecta con Atlas.
 * Prueba la dirección de DATABASE_URL en 3 pasos y explica en español qué falla
 * (IP no autorizada, usuario o contraseña, dirección mal escrita, clúster en pausa…).
 * Nunca muestra la contraseña.
 *
 * Uso:  npm run db:check
 *   1. Revisa el formato de DATABASE_URL (sin conectarse).
 *   2. Se conecta con el driver de MongoDB y lee la base de datos (permisos).
 *   3. Se conecta con Prisma, el mismo motor que usa la web.
 */
import "dotenv/config";
import { MongoClient } from "mongodb";
import { crearClienteScripts } from "../prisma/catalogo";
import {
  conTiempoLimite,
  explicarErrorBD,
  ocultarSecretos,
  revisarDireccion,
  type ErrorBDExplicado,
} from "../src/lib/diagnosticoBD";

/** Tiempo máximo de cada prueba */
const LIMITE_MS = 10_000;

function fallo(paso: string, error: ErrorBDExplicado): never {
  console.error(`\n✘ ${paso}: ${error.explicacion}`);
  console.error(`  Detalle técnico: ${error.detalle}`);
  process.exit(1);
}

async function main() {
  const url = process.env.DATABASE_URL;

  // 1. Formato
  const direccionMal = revisarDireccion(url);
  if (direccionMal) fallo("Dirección", direccionMal);
  const direccion = new URL(url!.replace(/^mongodb\+srv:/, "http:").replace(/^mongodb:/, "http:"));
  console.log(`Clúster:        ${direccion.hostname}`);
  console.log(`Usuario:        ${decodeURIComponent(direccion.username)}`);
  console.log(`Base de datos:  ${direccion.pathname.slice(1)}`);
  console.log(`Dirección:      ${ocultarSecretos(url!)}`);
  console.log("✔ El formato de DATABASE_URL es correcto.");

  // 2. Driver de MongoDB: conexión, contraseña y permisos sobre la base de datos
  const cliente = new MongoClient(url!, { serverSelectionTimeoutMS: LIMITE_MS });
  try {
    const inicio = Date.now();
    await cliente.connect();
    await cliente.db().command({ ping: 1 });
    const colecciones = await cliente.db().listCollections({}, { nameOnly: true }).toArray();
    console.log(
      `✔ Conexión con MongoDB en ${Date.now() - inicio} ms: ${colecciones.length} colecciones en "${cliente.db().databaseName}".`,
    );
    if (colecciones.length === 0) {
      console.log(
        "  (Está vacía: el Build Command de Render ejecuta «npm run db:push» y después «npm run db:catalogo» carga el catálogo.)",
      );
    }
  } catch (error) {
    fallo("Conexión (driver de MongoDB)", explicarErrorBD(error));
  } finally {
    await cliente.close().catch(() => {});
  }

  // 3. Prisma (el motor de la web: si esto falla y lo anterior no, el problema está en el motor)
  const prisma = crearClienteScripts();
  try {
    const inicio = Date.now();
    await conTiempoLimite(prisma.$runCommandRaw({ ping: 1 }), LIMITE_MS);
    console.log(`✔ Conexión con Prisma en ${Date.now() - inicio} ms.`);
  } catch (error) {
    fallo("Conexión (Prisma)", explicarErrorBD(error));
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  console.log("\nTodo bien: la web puede conectarse a la base de datos.");
}

main().catch((error: unknown) => fallo("Error inesperado", explicarErrorBD(error)));
