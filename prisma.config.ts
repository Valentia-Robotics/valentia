/**
 * Configuración de Prisma (la herramienta que gestiona la base de datos).
 * Aquí se indica dónde está el esquema, dónde se guardan las migraciones,
 * cómo se cargan los datos de prueba y a qué base de datos conectarse.
 */
import "dotenv/config"; // Lee el archivo .env (Prisma 7 no lo hace solo)
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Comando que ejecuta "npx prisma db seed" para cargar los datos de prueba
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // La dirección de la base de datos sale de DATABASE_URL en el archivo .env
    url: env("DATABASE_URL"),
  },
});
