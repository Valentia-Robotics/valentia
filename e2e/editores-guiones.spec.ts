/**
 * EDITORES Y GUIONES: flujo completo con un admin, dos editores y un cliente de prueba,
 * y comprobación de que cada uno solo puede entrar donde le toca.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";
import { MongoClient } from "mongodb";
import { emailNuevo, escribirCodigo, esperarCodigo } from "./ayudantes";
import { urlBDPruebas } from "./recorrer";

const TITULO = "Cómo sigue la línea un robot";
const NO_EXISTE = "Aquí todavía no hay nada";
const ENLACE = "https://youtu.be/video-de-prueba";

/** Cada persona, en su propio navegador */
async function crearCuenta(browser: Browser, nombre: string, prefijo: string) {
  const pagina = await (await browser.newContext()).newPage();
  const email = emailNuevo(prefijo);
  await pagina.goto("/registro");
  await pagina.getByRole("button", { name: "Rechazar opcionales" }).click();
  await pagina.getByLabel("Nombre").fill(nombre);
  await pagina.getByLabel("Email").fill(email);
  await pagina.getByLabel("Contraseña").fill("robots-de-prueba-2026");
  await pagina.getByRole("button", { name: "Crear mi cuenta" }).click();
  await pagina.waitForURL(/\/verificar/);
  await escribirCodigo(pagina, await esperarCodigo(email));
  await pagina.waitForURL((url) => !url.pathname.startsWith("/verificar"));
  return { pagina, email, nombre };
}

async function hacerAdmin(email: string) {
  const cliente = new MongoClient(urlBDPruebas());
  try {
    const bd = cliente.db();
    expect(bd.databaseName).toMatch(/_e2e$/); // nunca en otra base de datos
    await bd.collection("Usuario").updateOne({ email }, { $set: { rol: "ADMIN" } });
  } finally {
    await cliente.close();
  }
}

/** Pulsa un botón que abre la ventana de confirmar, y confirma */
async function confirmar(pagina: Page, boton: string, si: string) {
  await pagina.getByRole("button", { name: boton, exact: true }).click();
  await pagina.getByRole("dialog").getByRole("button", { name: si }).click();
  await expect(pagina.getByRole("dialog")).toHaveCount(0);
}

async function darRolEditor(admin: Page, email: string) {
  await admin.goto(`/admin/usuarios?q=${encodeURIComponent(email)}`);
  await confirmar(admin, "Hacer editor", "Sí, hacer editor");
  await expect(admin.getByRole("button", { name: "Quitar editor" })).toBeVisible();
}

/** Ni el contenido de la zona ni su menú: la página de «no existe» */
async function noExiste(pagina: Page, ruta: string) {
  await pagina.goto(ruta);
  await expect(pagina.getByRole("heading", { name: NO_EXISTE })).toBeVisible();
}

test("flujo completo de un guion, con permisos de cada rol", async ({ browser }) => {
  test.setTimeout(180_000);
  const admin = await crearCuenta(browser, "Ada Admin", "admin");
  const ana = await crearCuenta(browser, "Ana Editora", "ana");
  const luis = await crearCuenta(browser, "Luis Editor", "luis");
  const cliente = await crearCuenta(browser, "Clara Cliente", "clara");
  await hacerAdmin(admin.email);

  let ruta = "";

  await test.step("el admin da el rol de editor desde Usuarios", async () => {
    await darRolEditor(admin.pagina, ana.email);
    await darRolEditor(admin.pagina, luis.email);
  });

  await test.step("crea un guion: la categoría es obligatoria", async () => {
    const pagina = admin.pagina;
    await pagina.goto("/admin/contenido/nuevo");
    await pagina.getByLabel("Título").fill(TITULO);
    await pagina.getByLabel("Plataforma destino").selectOption("VIDEO_CORTO");
    await pagina.getByLabel("Duración objetivo").fill("45 segundos");
    await pagina.getByLabel("Fecha límite").fill("2030-01-15");
    await pagina.getByLabel("Gancho (primeros 3 segundos)").fill("¿Cómo ve la línea un robot?");
    await pagina.getByLabel("Desarrollo").fill("Texto aprobado del guion.");
    await pagina.getByLabel("Llamada a la acción").fill("Monta el tuyo con Valentia.");
    await pagina.getByLabel("Notas visuales para la edición").fill("Primer plano del sensor.");
    await pagina.getByRole("button", { name: "Crear guion" }).click();
    await expect(pagina.getByText("Revisa los campos marcados en rojo.")).toBeVisible();

    await pagina.getByLabel("Categoría").selectOption({ label: "Robótica" });
    await pagina.getByRole("button", { name: "Crear guion" }).click();
    await pagina.waitForURL(/\/admin\/contenido\/[0-9a-f]{24}$/);
    ruta = new URL(pagina.url()).pathname;
  });

  const idGuion = () => ruta.split("/").pop();

  await test.step("no se puede asignar antes de aprobar", async () => {
    const pagina = admin.pagina;
    await expect(pagina.getByRole("button", { name: "Asignar", exact: true })).toHaveCount(0);
    await confirmar(pagina, "Enviar a aprobación", "Sí, enviar");
    await expect(pagina.getByRole("button", { name: "Asignar", exact: true })).toHaveCount(0);
  });

  await test.step("se puede corregir antes de asignar, y hay que volver a aprobar", async () => {
    const pagina = admin.pagina;
    await confirmar(pagina, "Aprobar", "Sí, aprobar");
    await expect(pagina.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
    await confirmar(pagina, "Corregir (volver a borrador)", "Sí, volver a borrador");
    await pagina.getByLabel("Desarrollo").fill("Texto corregido y aprobado del guion.");
    await pagina.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(pagina.getByText("Guion guardado.")).toBeVisible();
    await confirmar(pagina, "Enviar a aprobación", "Sí, enviar");
    await confirmar(pagina, "Aprobar", "Sí, aprobar");
  });

  await test.step("antes de asignarlo, ningún editor lo ve", async () => {
    await ana.pagina.goto("/editor");
    await expect(ana.pagina.getByText("Todavía no tienes guiones asignados.")).toBeVisible();
    await noExiste(ana.pagina, `/editor/${idGuion()}`);
  });

  await test.step("lo asigna a Ana", async () => {
    const pagina = admin.pagina;
    await pagina
      .getByLabel("Editor", { exact: true })
      .selectOption({ label: `${ana.nombre} (${ana.email})` });
    await pagina.getByRole("button", { name: "Asignar", exact: true }).click();
    await expect(pagina.getByText(`Editor: ${ana.nombre}`)).toBeVisible();
    await expect(pagina.getByRole("button", { name: "Corregir (volver a borrador)" })).toHaveCount(
      0,
    );
  });

  await test.step("permisos: cada rol solo entra en lo suyo", async () => {
    await noExiste(ana.pagina, "/admin");
    await noExiste(ana.pagina, "/admin/contenido");
    await noExiste(ana.pagina, "/admin/contenido/metricas");
    await noExiste(ana.pagina, ruta);
    await noExiste(luis.pagina, `/editor/${idGuion()}`);
    await luis.pagina.goto("/editor");
    await expect(luis.pagina.getByText(TITULO)).toHaveCount(0);
    await noExiste(cliente.pagina, "/editor");
    await noExiste(cliente.pagina, `/editor/${idGuion()}`);
    await noExiste(cliente.pagina, "/admin/contenido");
    await noExiste(admin.pagina, "/editor");

    const anonimo = await (await browser.newContext()).newPage();
    await anonimo.goto("/editor");
    await anonimo.waitForURL(/\/login\?callbackUrl=/);
    await admin.pagina.goto(ruta);
  });

  await test.step("Ana empieza, escribe sus notas y entrega", async () => {
    const pagina = ana.pagina;
    await pagina.goto("/editor");
    await pagina.getByRole("link", { name: TITULO }).click();
    await expect(pagina.getByText("Texto corregido y aprobado del guion.")).toBeVisible();
    // El texto aprobado se lee, pero no hay ningún campo para cambiarlo
    await expect(pagina.getByLabel("Desarrollo")).toHaveCount(0);
    await expect(pagina.getByText(/métricas/i)).toHaveCount(0);

    await confirmar(pagina, "Empezar", "Sí, empezar");
    await pagina.getByLabel("Tus notas o tu versión adaptada").fill("Mi versión con más ritmo.");
    await pagina.getByRole("button", { name: "Guardar notas" }).click();
    await expect(pagina.getByText("Notas guardadas.")).toBeVisible();

    await pagina.getByRole("button", { name: "Entregar" }).click();
    await expect(pagina.getByText(/empezando por https/).first()).toBeVisible();
    await pagina.getByLabel("Enlace del vídeo terminado").fill(ENLACE);
    await pagina.getByRole("button", { name: "Entregar" }).click();
    await expect(pagina.getByText("Entregado. Falta la revisión.")).toBeVisible();
  });

  await test.step("el admin la devuelve con un comentario, y Ana lo ve", async () => {
    await admin.pagina.goto(ruta);
    await expect(admin.pagina.getByRole("link", { name: ENLACE })).toBeVisible();
    await expect(admin.pagina.getByText("Mi versión con más ritmo.")).toBeVisible();
    await admin.pagina.getByRole("button", { name: "Devolver con comentarios" }).click();
    await expect(admin.pagina.getByText("Explica qué hay que cambiar.")).toBeVisible();
    await admin.pagina.getByLabel("Comentario de cambios").fill("Sube la música del final.");
    await admin.pagina.getByRole("button", { name: "Devolver con comentarios" }).click();
    await expect(admin.pagina.getByRole("button", { name: "Reasignar" })).toBeVisible();

    await ana.pagina.reload();
    await expect(ana.pagina.getByText("Sube la música del final.")).toBeVisible();
    await ana.pagina.getByRole("button", { name: "Entregar" }).click();
    await expect(ana.pagina.getByText("Entregado. Falta la revisión.")).toBeVisible();
  });

  await test.step("no se le puede quitar el rol con un guion activo", async () => {
    await admin.pagina.goto(`/admin/usuarios?q=${encodeURIComponent(ana.email)}`);
    await admin.pagina.getByRole("button", { name: "Quitar editor" }).click();
    await admin.pagina.getByRole("dialog").getByRole("button", { name: "Sí, quitar" }).click();
    await expect(admin.pagina.getByText(/guion activo/)).toBeVisible();
    await admin.pagina.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
  });

  await test.step("el admin la completa y las métricas lo reflejan", async () => {
    await admin.pagina.goto(ruta);
    await confirmar(admin.pagina, "Marcar completado", "Sí, completar");
    await admin.pagina.goto("/admin/contenido/metricas");
    const fila = admin.pagina.getByRole("row", { name: new RegExp(ana.email) });
    await expect(fila).toBeVisible();
    // Asignados, en progreso, entregados, completados, devueltos
    const celdas = await fila.getByRole("cell").allTextContents();
    expect(celdas.slice(1, 6)).toEqual(["1", "0", "1", "1", "1"]);
    expect(celdas[7]).toBe("100 %");
  });

  await test.step("el tablero y los filtros funcionan", async () => {
    const pagina = admin.pagina;
    await pagina.goto("/admin/contenido?vista=tablero");
    await expect(pagina.getByRole("link", { name: new RegExp(TITULO) })).toBeVisible();
    await pagina.goto("/admin/contenido?estado=BORRADOR");
    await expect(pagina.getByText("No hay ningún guion con estos filtros.").first()).toBeVisible();
    await pagina.goto("/admin/contenido?estado=COMPLETADO");
    await expect(pagina.getByRole("link", { name: TITULO })).toBeVisible();
  });

  await test.step("sin guiones activos, se le puede quitar el rol y pierde el panel", async () => {
    await admin.pagina.goto(`/admin/usuarios?q=${encodeURIComponent(ana.email)}`);
    await confirmar(admin.pagina, "Quitar editor", "Sí, quitar");
    await noExiste(ana.pagina, "/editor");
  });
});
