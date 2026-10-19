/**
 * Aplica las migraciones pendientes de la base de datos al publicar (parte de "npm run build").
 * Solo actúa con PostgreSQL: con SQLite (tu ordenador) las migraciones se aplican con "npm run db:migrate".
 *
 * En Vercel hay tres entornos (VERCEL_ENV):
 *   production → siempre migra la base de datos de la web publicada.
 *   preview    → (la vista previa de cada pull request) migra SOLO si BD_DE_PRUEBAS="si".
 *                Así un pull request sin unir nunca cambia la base de datos real por error.
 *   (fuera de Vercel) → migra si DATABASE_URL es de PostgreSQL.
 *
 * Uso: node scripts/migrar-al-publicar.mjs
 */
import "dotenv/config";
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";

if (!/^postgres(ql)?:\/\//.test(url)) {
  console.log("ℹ Base de datos SQLite: no se aplican migraciones al compilar.");
  process.exit(0);
}

if (process.env.VERCEL_ENV === "preview" && process.env.BD_DE_PRUEBAS !== "si") {
  console.warn(
    '⚠ Vista previa sin BD_DE_PRUEBAS="si": NO se aplican migraciones (la base de datos podría ser la real).\n' +
      "  Configura una base de datos de pruebas para las vistas previas (ver PUBLICAR.md).",
  );
  process.exit(0);
}

console.log("▶ Aplicando migraciones pendientes de PostgreSQL…");
execSync("npx prisma migrate deploy", { stdio: "inherit" });
