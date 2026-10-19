/**
 * Hace (o deja de hacer) administrador a alguien EN LA WEB PUBLICADA, desde tu ordenador.
 * En Vercel no hay terminal, así que se ejecuta aquí contra la base de datos de producción.
 *
 * Uso (PowerShell), con la conexión DIRECTA de Neon de producción:
 *   $env:DATABASE_URL_PUBLICADA="postgresql://…"
 *   npm run admin:web -- tu@email.com            (o: -- tu@email.com --quitar)
 *   Remove-Item Env:DATABASE_URL_PUBLICADA
 *
 * El cliente de Prisma depende de la base de datos (SQLite o PostgreSQL): este script lo genera
 * para PostgreSQL, ejecuta "npm run admin" y al terminar lo deja otra vez como estaba (SQLite).
 */
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL_PUBLICADA ?? "";
const argumentos = process.argv.slice(2);

if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error(
    "✖ Falta DATABASE_URL_PUBLICADA con la dirección de PostgreSQL de la web publicada (ver PUBLICAR.md).",
  );
  process.exit(1);
}
// Solo emails y --quitar: nada más llega a la línea de órdenes
if (argumentos.length === 0 || !argumentos.every((a) => /^([\w.+-]+@[\w.-]+|--quitar)$/.test(a))) {
  console.error("✖ Uso: npm run admin:web -- tu@email.com [--quitar]");
  process.exit(1);
}

const publicada = { ...process.env, DATABASE_URL: url };
// Sin DATABASE_URL: Prisma vuelve a leer la de tu archivo .env (SQLite)
const local = { ...process.env };
delete local.DATABASE_URL;
delete local.DATABASE_URL_DIRECTA;

try {
  execSync("npx prisma generate", { env: publicada, stdio: "ignore" });
  execSync(`npx tsx scripts/hacer-admin.ts ${argumentos.join(" ")}`, {
    env: publicada,
    stdio: "inherit",
  });
} catch {
  process.exitCode = 1;
} finally {
  execSync("npx prisma generate", { env: local, stdio: "ignore" });
  console.log("✔ Tu copia local vuelve a usar su base de datos de siempre.");
}
