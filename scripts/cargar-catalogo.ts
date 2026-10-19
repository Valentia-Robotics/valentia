/**
 * Carga el catálogo inicial (data/*.json) en una base de datos SIN catálogo. Sirve en producción:
 * no crea usuarios ni códigos de prueba. Si ya hay catálogo, no toca nada.
 *
 * Uso: npm run db:catalogo   (en producción, desde la Shell de Render; ver DESPLIEGUE.md)
 */
import { cargarCatalogo, crearClienteScripts } from "../prisma/catalogo";

const db = crearClienteScripts();

cargarCatalogo(db)
  .catch((error: unknown) => {
    console.error("✖ No se pudo cargar el catálogo.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
