/**
 * Configuración de Prisma (la herramienta que gestiona la base de datos).
 * Aquí se indica dónde está el esquema, dónde se guardan las migraciones,
 * cómo se cargan los datos de prueba y a qué base de datos conectarse.
 *
 * SQLite o PostgreSQL se elige SOLO con DATABASE_URL:
 *   file:…          → prisma/schema.prisma            + prisma/migrations
 *   postgresql://…  → prisma/postgresql/schema.prisma + prisma/postgresql/migrations
 * (la copia para PostgreSQL la genera scripts/esquema-postgres.mjs; ver README).
 */
import "dotenv/config"; // Lee el archivo .env (Prisma 7 no lo hace solo)
import { defineConfig, env } from "prisma/config";

const postgres = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const carpeta = postgres ? "prisma/postgresql" : "prisma";

export default defineConfig({
  schema: `${carpeta}/schema.prisma`,
  migrations: {
    path: `${carpeta}/migrations`,
    // Comando que ejecuta "npx prisma db seed" para cargar los datos de prueba
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // La dirección de la base de datos sale de DATABASE_URL en el archivo .env
    url: env("DATABASE_URL"),
  },
});
