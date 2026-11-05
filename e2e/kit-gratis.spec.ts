/**
 * KIT GRATIS: sale en /kits con el precio «Gratis» y se consigue sin carrito ni pago.
 * Sin sesión pide iniciarla; con sesión da el curso y lleva a él, sin crear ningún pedido.
 */
import { expect, test } from "@playwright/test";
import { emailNuevo, escribirCodigo, esperarCodigo } from "./ayudantes";

const FICHA = "/kits/bienvenida-valentia";
const CONTRASENA = "robots2026";

test("el kit gratis se activa con un clic y no crea ningún pedido", async ({ page }) => {
  await test.step("sale en /kits como «Gratis»", async () => {
    await page.goto("/kits");
    const tarjeta = page.locator("article", { hasText: "Kit de bienvenida" });
    await expect(tarjeta.getByText("Gratis", { exact: true })).toBeVisible();
  });

  await test.step("su ficha no habla de piezas, carrito ni QR", async () => {
    await page.goto(FICHA);
    await expect(page.getByText("Gratis", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Qué hay en la caja." })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /carrito/i })).toHaveCount(0);
  });

  await test.step("sin sesión, pide iniciarla", async () => {
    await page.getByRole("button", { name: "Conseguir gratis" }).click();
    await page.waitForURL(/\/login\?callbackUrl=/);
  });

  const email = emailNuevo("gratis");
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Prueba Gratis");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(CONTRASENA);
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await escribirCodigo(page, await esperarCodigo(email));
  await page.waitForURL((url) => !url.pathname.startsWith("/verificar"));

  await test.step("con sesión, lleva al curso", async () => {
    await page.goto(FICHA);
    await page.getByRole("button", { name: "Conseguir gratis" }).click();
    await page.waitForURL(/\/cursos\/bienvenida-a-valentia/);
    await expect(page.getByRole("heading", { name: "Te damos la bienvenida" })).toBeVisible();
  });

  await test.step("repetirlo lleva al mismo curso, y no hay ningún pedido", async () => {
    await page.goto(FICHA);
    await page.getByRole("button", { name: "Conseguir gratis" }).click();
    await page.waitForURL(/\/cursos\/bienvenida-a-valentia/);

    await page.goto("/cursos");
    await expect(page.getByRole("heading", { name: "Bienvenida a Valentia" })).toHaveCount(1);
    await page.goto("/cuenta/pedidos");
    await expect(page.getByText("Kit de bienvenida")).toHaveCount(0);
  });
});
