/**
 * Pruebas de extremo a extremo (npm run test:e2e): un navegador de verdad recorre la web
 * como lo haría una persona. Usa el Chrome instalado en el ordenador.
 *
 * Arranca su PROPIA copia de la web en http://localhost:3100 (compilada, como en producción)
 * con su PROPIA base de datos (prisma/e2e.db), así que no toca tus datos ni tu "npm run dev".
 * Los pagos van en modo de prueba y los correos se leen de la carpeta .correos-dev/.
 */
import { defineConfig } from "@playwright/test";

const PUERTO = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    channel: "chrome",
    viewport: { width: 1280, height: 900 },
    locale: "es-ES",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `node scripts/e2e-preparar.mjs && npm run build && npx next start -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    timeout: 600_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      DATABASE_URL: "file:./prisma/e2e.db",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PUERTO}`,
      CORREO_PROVEEDOR: "consola",
      // Sin Stripe: el checkout usa el pago de prueba (permitido también con "next start")
      STRIPE_SECRET_KEY: "",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "",
      PERMITIR_PAGO_SIMULADO: "si",
      ALMACEN_PROVEEDOR: "local",
    },
  },
});
