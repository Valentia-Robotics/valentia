/**
 * Configuración de Vitest: pruebas unitarias rápidas (npm test).
 * Prueban funciones sueltas sin navegador ni base de datos: precios, envíos, compatibilidad…
 * Las pruebas de extremo a extremo (con navegador) están en e2e/ y usan Playwright.
 */
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
