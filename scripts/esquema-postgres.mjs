/**
 * Genera prisma/postgresql/schema.prisma a partir de prisma/schema.prisma (el que se edita).
 * Es el mismo esquema con provider = "postgresql". prisma.config.ts lo usa solo cuando
 * DATABASE_URL es de PostgreSQL. Se ejecuta en "npm run build" y en "npm run db:postgres",
 * así las dos versiones nunca se desincronizan.
 *
 * Uso: node scripts/esquema-postgres.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const origen = readFileSync("prisma/schema.prisma", "utf8");
if (!/provider = "sqlite"/.test(origen)) {
  throw new Error('prisma/schema.prisma tiene que seguir con provider = "sqlite"');
}

const aviso = `// ============================================================
//  ARCHIVO GENERADO por scripts/esquema-postgres.mjs — NO LO EDITES A MANO.
//  Edita prisma/schema.prisma; esta copia (para PostgreSQL) se actualiza sola.
// ============================================================

`;

const destino =
  aviso +
  origen
    .replace('provider = "sqlite"', 'provider = "postgresql"')
    // La carpeta está un nivel más abajo: la ruta del cliente generado cambia
    .replace('output   = "../src/generated/prisma"', 'output   = "../../src/generated/prisma"');

mkdirSync("prisma/postgresql", { recursive: true });
writeFileSync("prisma/postgresql/schema.prisma", destino);
console.log("✔ prisma/postgresql/schema.prisma actualizado");
