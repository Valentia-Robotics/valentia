/**
 * Configuración de Prisma (la herramienta que gestiona la base de datos).
 * Aquí se indica dónde está el esquema y cómo se cargan los datos de prueba.
 * La dirección de la base de datos (DATABASE_URL, en .env) se lee en prisma/schema.prisma.
 *
 * MongoDB no usa migraciones: "npm run db:push" crea las colecciones y los índices (ver README).
 */
import "dotenv/config"; // Lee el archivo .env (con este archivo, Prisma no lo hace solo)
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // Comando que ejecuta "npx prisma db seed": catálogo + datos de prueba (solo en desarrollo)
    seed: "tsx prisma/seed.ts",
  },
});
