/**
 * Pruebas del backend (npm test). La lógica de negocio sigue en frontend/src, de ahí el alias:
 * irá pasando a backend/ a medida que avance la separación.
 */
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "../frontend/src"),
      // Solo bloquea su uso en el navegador; fuera de Next no hace falta
      "server-only": path.resolve(
        import.meta.dirname,
        "../frontend/node_modules/server-only/empty.js",
      ),
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**"],
    environment: "node",
  },
});
