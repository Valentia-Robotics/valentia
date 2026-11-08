/**
 * RECORRIDO COMPLETO de una persona nueva en Valentia:
 * registro → verificación por correo → configurador → carrito → pago de prueba →
 * activación del código del kit → ver el vídeo → hacer el test.
 */
import { expect, test } from "@playwright/test";
import { correosPara, emailNuevo, escribirCodigo, esperarCodigo } from "./ayudantes";

test("recorrido completo: de la cuenta nueva al test de la primera lección", async ({ page }) => {
  const email = emailNuevo("recorrido");
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(String(e)));

  await test.step("se registra y verifica su email con el código", async () => {
    await page.goto("/registro");
    await page.getByLabel("Nombre").fill("Lucía Pruebas");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill("robots-de-prueba-2026");
    await page.getByRole("button", { name: "Crear mi cuenta" }).click();
    await page.waitForURL(/\/verificar/);
    await escribirCodigo(page, await esperarCodigo(email));
    await page.waitForURL((url) => !url.pathname.startsWith("/verificar"));
    // Sin cursos todavía: mensaje vacío amable
    await page.goto("/cursos");
    await expect(page.getByRole("heading", { name: "Todavía no tienes cursos" })).toBeVisible();
  });

  await test.step("monta un robot en el configurador y lo añade al carrito", async () => {
    await page.goto("/configurador?kit=coche-seguidor-de-lineas");
    const anadir = page
      .getByRole("button", { name: /añadir al carrito/i })
      .filter({ visible: true });
    await expect(anadir.first()).toBeEnabled();
    await anadir.first().click();
  });

  await test.step("añade también el kit (que trae curso)", async () => {
    await page.goto("/kits/coche-seguidor-de-lineas");
    await page
      .getByRole("button", { name: /añadir/i })
      .first()
      .click();
    await page.goto("/carrito");
    await expect(
      page.getByText("Kit de coche robótico multifunción VR1 - Starter Kit").first(),
    ).toBeVisible();
    await expect(page.getByText(/IVA incluido \(21 %\)/)).toBeVisible();
    await page.getByRole("link", { name: "Tramitar pedido" }).click();
  });

  let codigoKit = "";
  await test.step("paga con el pago de prueba", async () => {
    await page.waitForURL(/\/checkout/);
    await page.getByLabel("Teléfono").fill("612 345 678");
    await page.getByLabel("Dirección", { exact: true }).fill("Calle de la Paz 10");
    await page.getByLabel("Código postal").fill("46003");
    await page.getByLabel("Ciudad").fill("Valencia");
    await expect(page.getByLabel("Provincia")).toHaveValue("Valencia");
    await page.getByLabel(/He leído y acepto/).check();
    await page.getByRole("button", { name: /Continuar al pago/ }).click();
    await page.getByRole("button", { name: /Confirmar pago de prueba/ }).click();
    await page.waitForURL(/\/pedido\//);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Gracias, Lucía/);
    codigoKit = (await page
      .getByText(/^VAL-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
      .first()
      .textContent())!.trim();
    expect(codigoKit).toMatch(/^VAL-/);
    // Correo de confirmación con el IVA desglosado
    await expect
      .poll(() => correosPara(email).find((c) => /confirmado/.test(c.asunto))?.texto ?? "")
      .toMatch(/IVA incluido \(21 %\)/);
  });

  await test.step("activa el código del kit", async () => {
    await page.goto(`/activar?codigo=${codigoKit}`);
    await page.getByRole("button", { name: "Activar mi curso" }).click();
    await page.waitForURL(/\/cursos\/.+\/.+/);
    await expect(page.getByText("¡Curso activado!")).toBeVisible();
  });

  await test.step("el test se desbloquea al terminar el vídeo", async () => {
    const boton = page.getByRole("button", { name: "Hacer el test" });
    await expect(boton).toBeDisabled();
    // Simulamos que el vídeo llega al final (el mismo evento que lanza el reproductor)
    await page.locator("video").evaluate((video) => video.dispatchEvent(new Event("ended")));
    await expect(page.getByText("¡Vídeo terminado!")).toBeVisible();
    await page.getByRole("link", { name: "Hacer el test" }).click();
    await page.waitForURL(/\/test$/);
  });

  await test.step("hace el test pregunta a pregunta y ve su resultado", async () => {
    await expect(page.getByText(/Pregunta 1 de/)).toBeVisible();
    // Responde hasta que aparece el botón de ver el resultado
    for (let i = 0; i < 20; i++) {
      await page
        .locator("label")
        .filter({ has: page.locator("input[type=radio]") })
        .first()
        .click();
      const resultado = page.getByRole("button", { name: "Ver mi resultado" });
      if (await resultado.isVisible()) {
        await resultado.click();
        break;
      }
      await page.getByRole("button", { name: "Siguiente" }).click();
    }
    await expect(page.getByRole("heading", { name: "Tus respuestas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Repetir el test" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver a ver el vídeo" })).toBeVisible();
  });

  expect(errores).toEqual([]);
});
