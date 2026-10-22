/**
 * CUENTAS SIN VERIFICAR (se registraron pero no escribieron el código del correo):
 * no entran, no activan códigos, no cuentan en el panel, se pueden reenviar el código o borrar
 * desde el panel, volver a registrarse sigue con la misma cuenta y se borran solas a los 7 días.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";
import { ObjectId } from "mongodb";
import {
  conBD,
  correosPara,
  emailNuevo,
  escribirCodigo,
  esperarCodigo,
  iniciarSesion,
  registrar,
  vaciarLimites,
} from "./ayudantes";

const CONTRASENA = "robots-de-prueba-2026";

test.beforeEach(() => vaciarLimites());

/** Una página en un navegador nuevo (sin cookies) */
async function navegadorNuevo(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

/** Crea una cuenta verificada, la hace ADMIN y deja la sesión abierta en "pagina" */
async function entrarComoAdmin(pagina: Page) {
  const email = emailNuevo("admin");
  await registrar(pagina, email, CONTRASENA, "Admin Pruebas");
  await escribirCodigo(pagina, await esperarCodigo(email));
  await pagina.waitForURL((url) => !url.pathname.startsWith("/verificar"));
  await conBD((bd) => bd.collection("Usuario").updateOne({ email }, { $set: { rol: "ADMIN" } }));
}

/** El último código enviado se da por enviado hace 2 minutos (si no, en 60 s se reutiliza el mismo) */
function retrasarUltimoEnvio(email: string) {
  return conBD((bd) =>
    bd
      .collection("Verificacion")
      .updateMany({ email }, { $set: { enviadoEn: new Date(Date.now() - 2 * 60_000) } }),
  );
}

/** Cifras de la tarjeta «Usuarios registrados» del inicio del panel */
async function cifrasPanel(pagina: Page) {
  await pagina.goto("/admin");
  const texto = await pagina.getByRole("link", { name: /Usuarios registrados/ }).innerText();
  return {
    registrados: Number(texto.match(/registrados\s*(\d+)/)?.[1]),
    pendientes: Number(texto.match(/(\d+) pendientes? de verificar/)?.[1]),
  };
}

test("una cuenta sin verificar no entra, no activa códigos y no cuenta en el panel", async ({
  page,
  browser,
}) => {
  await entrarComoAdmin(page);
  const antes = await cifrasPanel(page);

  const email = emailNuevo("pendiente");
  const pendiente = await navegadorNuevo(browser);
  await registrar(pendiente, email, CONTRASENA);

  await test.step("no cuenta como registrada; sale aparte como pendiente", async () => {
    const despues = await cifrasPanel(page);
    expect(despues.registrados).toBe(antes.registrados);
    expect(despues.pendientes).toBe(antes.pendientes + 1);

    await page.goto(`/admin/usuarios?estado=pendientes&q=${encodeURIComponent(email)}`);
    const fila = page.getByRole("row").filter({ hasText: email });
    await expect(fila.getByText("Pendiente", { exact: true })).toBeVisible();
    await page.goto(`/admin/usuarios?estado=verificados&q=${encodeURIComponent(email)}`);
    await expect(page.getByText("No hay ninguna cuenta con estos filtros.")).toBeVisible();
  });

  await test.step("no puede iniciar sesión: se le pide el código", async () => {
    const otro = await navegadorNuevo(browser);
    await iniciarSesion(otro, email, CONTRASENA);
    await otro.waitForURL(/\/verificar/);
    await otro.goto("/cuenta");
    await expect(otro).toHaveURL(/\/login\?callbackUrl=/);
  });

  await test.step("no puede activar el código de un kit", async () => {
    await pendiente.goto("/activar?codigo=VAL-PRUE-CAR2");
    await expect(pendiente.getByText(/Inicia sesión o crea una cuenta gratis/)).toBeVisible();
    await expect(pendiente.getByRole("button", { name: "Activar mi curso" })).toHaveCount(0);
    const cursos = await conBD(async (bd) => {
      const u = await bd.collection("Usuario").findOne({ email });
      return bd.collection("CursoUsuario").countDocuments({ usuarioId: u!._id });
    });
    expect(cursos).toBe(0);
  });
});

test("volver a registrarse con un email pendiente reenvía el código y cambia la contraseña", async ({
  page,
  browser,
}) => {
  const email = emailNuevo("repite");
  await registrar(page, email, "contrasena-primera-1");
  await retrasarUltimoEnvio(email);
  const correosAntes = correosPara(email).length;

  // Otro navegador, otro nombre y otra contraseña: sin «el email ya existe», a la pantalla del código
  const segunda = await navegadorNuevo(browser);
  await registrar(segunda, email, CONTRASENA, "Nombre Nuevo");
  await expect.poll(() => correosPara(email).length).toBe(correosAntes + 1);
  expect(correosPara(email)[0].asunto).toMatch(/código para activar/);
  expect(correosPara(email).some((c) => /Ya tienes una cuenta/.test(c.asunto))).toBe(false);

  await escribirCodigo(segunda, await esperarCodigo(email));
  await segunda.waitForURL((url) => !url.pathname.startsWith("/verificar"));

  const cuentas = await conBD((bd) => bd.collection("Usuario").find({ email }).toArray());
  expect(cuentas).toHaveLength(1);
  expect(cuentas[0].nombre).toBe("Nombre Nuevo");
  expect(cuentas[0].emailVerificadoEn).toBeInstanceOf(Date);

  // Vale la contraseña nueva (pide código por ser otro navegador) y ya no la primera
  const tercera = await navegadorNuevo(browser);
  await iniciarSesion(tercera, email, "contrasena-primera-1");
  await expect(tercera.getByText("El email o la contraseña no son correctos.")).toBeVisible();
  await iniciarSesion(tercera, email, CONTRASENA);
  await tercera.waitForURL(/\/verificar/);
});

test("panel: reenviar el código a una cuenta pendiente y eliminar otra", async ({
  page,
  browser,
}) => {
  await entrarComoAdmin(page);
  const pendiente = await navegadorNuevo(browser);

  await test.step("reenviar: el correo trae un enlace y un código que funcionan", async () => {
    const email = emailNuevo("reenviar");
    await registrar(pendiente, email, CONTRASENA);
    await retrasarUltimoEnvio(email);

    await page.goto(`/admin/usuarios?estado=pendientes&q=${encodeURIComponent(email)}`);
    await page.getByRole("button", { name: "Reenviar código", exact: true }).click();
    await page.getByRole("button", { name: "Sí, reenviar" }).click();

    let enlace = "";
    await expect
      .poll(() => {
        enlace = correosPara(email)[0]?.texto.match(/Confirmar mi email: (\S+)/)?.[1] ?? "";
        return enlace;
      })
      .toMatch(/\/verificar\/enlace\?t=/);

    // Se abre en un navegador que no tiene ninguna cookie
    const otro = await navegadorNuevo(browser);
    await otro.goto(enlace);
    await otro.waitForURL(/\/verificar$/);
    await escribirCodigo(otro, await esperarCodigo(email));
    await otro.waitForURL((url) => !url.pathname.startsWith("/verificar"));
    const usuario = await conBD((bd) => bd.collection("Usuario").findOne({ email }));
    expect(usuario?.emailVerificadoEn).toBeInstanceOf(Date);

    // El enlace ya usado no vuelve a servir
    const tarde = await navegadorNuevo(browser);
    await tarde.goto(enlace);
    await tarde.waitForURL(/\/login/);
  });

  await test.step("eliminar: se borra con sus códigos", async () => {
    const email = emailNuevo("eliminar");
    await registrar(pendiente, email, CONTRASENA);

    await page.goto(`/admin/usuarios?estado=pendientes&q=${encodeURIComponent(email)}`);
    await page.getByRole("button", { name: "Eliminar", exact: true }).click();
    await page.getByRole("button", { name: "Sí, eliminar" }).click();
    await expect(page.getByText("No hay ninguna cuenta con estos filtros.")).toBeVisible();

    const quedan = await conBD(async (bd) => ({
      usuarios: await bd.collection("Usuario").countDocuments({ email }),
      codigos: await bd
        .collection("Verificacion")
        .countDocuments({ email, usuarioId: { $ne: null } }),
    }));
    expect(quedan).toEqual({ usuarios: 0, codigos: 0 });
  });
});

test("las cuentas sin verificar de hace más de 7 días se borran solas (y nada más)", async ({
  page,
}) => {
  const haceDias = (dias: number) => new Date(Date.now() - dias * 24 * 60 * 60_000);
  const cuenta = (email: string, creadoEn: Date, emailVerificadoEn: Date | null) => ({
    _id: new ObjectId(),
    nombre: "Cuenta de prueba",
    email,
    contrasenaHash: "sin-contrasena",
    rol: "CLIENTE",
    creadoEn,
    emailVerificadoEn,
  });
  const vieja = cuenta(emailNuevo("vieja"), haceDias(8), null);
  const reciente = cuenta(emailNuevo("reciente"), haceDias(2), null);
  const verificada = cuenta(emailNuevo("verificada"), haceDias(30), haceDias(30));

  await conBD(async (bd) => {
    await bd.collection("Usuario").insertMany([vieja, reciente, verificada]);
    await bd.collection("Verificacion").insertOne({
      _id: new ObjectId(),
      tokenHash: `prueba-${vieja._id.toHexString()}`,
      usuarioId: vieja._id,
      email: vieja.email,
      motivo: "REGISTRO",
      codigoHash: "x",
      intentos: 0,
      caducaEn: new Date(Date.now() + 60_000),
      enviadoEn: new Date(),
      confirmadoEn: null,
      usadoEn: null,
      creadoEn: new Date(),
    });
  });

  // Cualquier registro hace la limpieza
  await registrar(page, emailNuevo("dispara"), CONTRASENA);

  const quedan = await conBD(async (bd) => ({
    vieja: await bd.collection("Usuario").countDocuments({ _id: vieja._id }),
    codigosVieja: await bd.collection("Verificacion").countDocuments({ usuarioId: vieja._id }),
    reciente: await bd.collection("Usuario").countDocuments({ _id: reciente._id }),
    verificada: await bd.collection("Usuario").countDocuments({ _id: verificada._id }),
  }));
  expect(quedan).toEqual({ vieja: 0, codigosVieja: 0, reciente: 1, verificada: 1 });
});
