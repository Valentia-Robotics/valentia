/**
 * TODAS LAS PÁGINAS: recorre la web compilada siguiendo los enlaces (tienda, cuenta y panel) y comprueba
 * en cada página que no hay errores de consola ni del servidor, enlaces rotos ni imágenes que no cargan.
 * Después repasa las páginas principales en un móvil (390 px) buscando desbordes horizontales.
 */
import { expect, test } from "@playwright/test";
import { MongoClient } from "mongodb";
import { emailNuevo, escribirCodigo, esperarCodigo } from "./ayudantes";
import { imagenesRotas, recorrer, urlBDPruebas, vigilar, type Problemas } from "./recorrer";

test("tienda: todas las páginas públicas sin errores", async ({ page }) => {
  const problemas: Problemas = [];
  vigilar(page, problemas);
  const vistas = await recorrer(
    page,
    [
      "/",
      "/kits",
      "/componentes",
      "/configurador",
      "/carrito",
      "/checkout",
      "/activar",
      "/login",
      "/registro",
      "/recuperar",
    ],
    (ruta) => !/^\/(admin|cursos|cuenta|pedido)/.test(ruta),
    problemas,
  );
  for (const ruta of [
    "/kits/coche-seguidor-de-lineas",
    "/legal/aviso-legal",
    "/legal/privacidad",
    "/legal/cookies",
    "/legal/condiciones",
    "/legal/devoluciones",
  ]) {
    expect(vistas, `no se ha llegado a ${ruta} siguiendo enlaces`).toContain(ruta);
  }

  // Estados especiales: código de activación inexistente y página que no existe
  await page.goto("/activar?codigo=VAL-ZZZZ-ZZZZ");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const noExiste = await page.goto("/kits/no-existe");
  expect(noExiste?.status()).toBe(404);
  await expect(page.getByRole("link", { name: /inicio|portada|kits/i }).first()).toBeVisible();

  expect(problemas.filter((p) => !p.includes("/kits/no-existe"))).toEqual([]);
});

test("cuenta y panel: todas las páginas sin errores", async ({ page }) => {
  test.setTimeout(600_000); // el panel tiene muchas páginas
  const problemas: Problemas = [];
  vigilar(page, problemas);
  const email = emailNuevo("paginas");

  await test.step("registro y verificación por correo", async () => {
    await page.goto("/registro");
    await page.getByLabel("Nombre").fill("Ana Paginas");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill("robots-de-prueba-2026");
    await page.getByRole("button", { name: "Crear mi cuenta" }).click();
    await page.waitForURL(/\/verificar/);
    await escribirCodigo(page, await esperarCodigo(email));
    await page.waitForURL((url) => !url.pathname.startsWith("/verificar"));
  });

  await test.step("activa un código de prueba y recorre cursos y cuenta", async () => {
    await page.goto("/activar?codigo=VAL-PRUE-BRZ2");
    await page.getByRole("button", { name: "Activar mi curso" }).click();
    await page.waitForURL(/\/cursos\/.+\/.+/);
    const vistas = await recorrer(
      page,
      ["/cursos", "/cuenta", "/cuenta/pedidos"],
      (r) => /^\/(cursos|cuenta)/.test(r),
      problemas,
    );
    expect(
      vistas.some((r) => /^\/cursos\/[^/]+\/[^/]+$/.test(r)),
      "lección",
    ).toBe(true);
    await page.goto("/cuenta");
    await expect(page.getByRole("heading", { name: /dispositivos/i })).toBeVisible();
  });

  await test.step("como administrador, recorre el panel", async () => {
    const cliente = new MongoClient(urlBDPruebas());
    try {
      const bd = cliente.db();
      expect(bd.databaseName).toMatch(/_e2e$/);
      await bd.collection("Usuario").updateOne({ email }, { $set: { rol: "ADMIN" } });
    } finally {
      await cliente.close();
    }
    const vistas = await recorrer(page, ["/admin"], (r) => r.startsWith("/admin"), problemas, 120);
    for (const zona of [
      "/admin/usuarios",
      "/admin/componentes",
      "/admin/kits",
      "/admin/cursos",
      "/admin/codigos",
      "/admin/pedidos",
    ]) {
      expect(vistas, zona).toContain(zona);
    }
    expect(
      vistas.some((r) => /^\/admin\/cursos\/[^/]+\/lecciones\/[^/]+$/.test(r)),
      "lección en el panel",
    ).toBe(true);
  });

  expect(problemas).toEqual([]);
});

test("móvil: páginas principales sin desbordes", async ({ browser }) => {
  const contexto = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "es-ES",
  });
  const page = await contexto.newPage();
  const problemas: Problemas = [];
  vigilar(page, problemas);
  for (const ruta of [
    "/",
    "/kits",
    "/kits/brazo-robotico",
    "/componentes",
    "/configurador",
    "/carrito",
    "/checkout",
    "/login",
    "/registro",
    "/activar",
    "/legal/privacidad",
  ]) {
    await page.goto(ruta);
    await page.waitForLoadState("load");
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (desborde > 1) problemas.push(`desborde horizontal de ${desborde}px en ${ruta}`);
    for (const src of await imagenesRotas(page)) problemas.push(`imagen rota en ${ruta}: ${src}`);
  }
  // El menú móvil se abre y lleva a los kits
  await page.goto("/");
  await page.getByRole("button", { name: /menú/i }).click();
  await expect(page.getByRole("link", { name: /kits/i }).first()).toBeVisible();
  await contexto.close();
  expect(problemas).toEqual([]);
});
