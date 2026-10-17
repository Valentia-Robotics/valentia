/**
 * Prepara la base de datos de las pruebas de extremo a extremo (prisma/e2e.db).
 * Es una base de datos APARTE: las pruebas nunca tocan prisma/dev.db.
 *   1. Borra e2e.db y la crea de nuevo con las migraciones y los datos iniciales (seed).
 *   2. Pone en la primera lección del coche un vídeo de archivo (para probar que el test
 *      se desbloquea al terminar el vídeo).
 * Lo ejecuta Playwright antes de arrancar la web (ver playwright.config.ts).
 */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import Database from "better-sqlite3";

const archivo = "prisma/e2e.db";
const env = { ...process.env, DATABASE_URL: `file:./${archivo}` };

for (const extra of ["", "-journal", "-wal", "-shm"]) rmSync(archivo + extra, { force: true });
execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
execSync("npx prisma db seed", { env, stdio: "inherit" });

const db = new Database(archivo);
db.prepare(
  `UPDATE Leccion SET videoUrl = '/e2e/video-de-prueba.mp4'
   WHERE orden = 1 AND cursoId = (SELECT cursoId FROM Kit WHERE slug = 'coche-seguidor-de-lineas')`,
).run();
db.close();
console.log("✔ Base de datos de pruebas lista:", archivo);
