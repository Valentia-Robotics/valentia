/** Comprobaciones rápidas de seguridad y de páginas públicas */
import { expect, test } from "@playwright/test";

test("las páginas privadas piden iniciar sesión", async ({ page }) => {
  for (const ruta of ["/cursos", "/cuenta", "/cuenta/pedidos", "/admin"]) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  }
});

test("un pedido no se puede ver sin su enlace privado", async ({ request }) => {
  const respuesta = await request.get("/pedido/no-existe?t=12345678901234567890123456789012");
  expect(respuesta.status()).toBe(404);
});

test("el webhook de Stripe rechaza avisos sin firma", async ({ request }) => {
  const respuesta = await request.post("/api/pagos/stripe", {
    data: { type: "payment_intent.succeeded" },
  });
  expect(respuesta.status()).toBe(400);
});

test("las páginas de desarrollo no existen en la versión publicada", async ({ request }) => {
  expect((await request.get("/dev/correos")).status()).toBe(404);
});

test("cabeceras de seguridad", async ({ request }) => {
  const r = await request.get("/");
  const h = r.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("un código postal de fuera de la zona muestra un mensaje amable", async ({ page }) => {
  await page.goto("/kits/brazo-robotico");
  await page
    .getByRole("button", { name: /añadir/i })
    .first()
    .click();
  await page.goto("/checkout");
  await page.getByLabel("Nombre y apellidos").fill("Pepe Madrid");
  await page.getByLabel("Email").fill("pepe@prueba.test");
  await page.getByLabel("Teléfono").fill("612345678");
  await page.getByLabel("Dirección", { exact: true }).fill("Gran Vía 1");
  await page.getByLabel("Código postal").fill("28013");
  await page.getByLabel("Ciudad").fill("Madrid");
  await page.getByLabel(/He leído y acepto/).check();
  await page.getByRole("button", { name: /Continuar al pago/ }).click();
  await expect(page.getByText(/solo enviamos a la Comunidad Valenciana/).first()).toBeVisible();
});

test("SEO: robots.txt y sitemap.xml", async ({ request }) => {
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/kits/vr1-starter-kit");
  expect(sitemap).not.toContain("/admin");
});
