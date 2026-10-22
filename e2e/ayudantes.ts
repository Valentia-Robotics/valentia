/**
 * Ayudantes de las pruebas E2E.
 * Los correos de la web de pruebas no se envían: se guardan en .correos-dev/ (ver src/lib/correo).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { MongoClient, type Db } from "mongodb";

const CARPETA_CORREOS = path.resolve(".correos-dev");

interface CorreoGuardado {
  para: string;
  asunto: string;
  texto: string;
}

/** Correos guardados para un email, del más nuevo al más antiguo */
export function correosPara(email: string): CorreoGuardado[] {
  let archivos: string[] = [];
  try {
    archivos = readdirSync(CARPETA_CORREOS).filter((a) => a.endsWith(".json"));
  } catch {
    return [];
  }
  return archivos
    .sort()
    .reverse()
    .map((a) => JSON.parse(readFileSync(path.join(CARPETA_CORREOS, a), "utf8")) as CorreoGuardado)
    .filter((c) => c.para === email);
}

/** Espera al correo con el código de 6 cifras y lo devuelve */
export async function esperarCodigo(email: string): Promise<string> {
  let codigo: string | undefined;
  await expect
    .poll(
      () => {
        codigo = correosPara(email)
          .map((c) => c.texto.match(/\b(\d{6})\b/)?.[1])
          .find(Boolean);
        return codigo;
      },
      { message: `No llega el código a ${email}`, timeout: 20_000 },
    )
    .toBeTruthy();
  return codigo!;
}

/** Escribe el código en las casillas de /verificar (se envía solo al completar las 6 cifras) */
export async function escribirCodigo(pagina: Page, codigo: string) {
  await pagina.locator("input").first().click();
  await pagina.keyboard.type(codigo);
}

/** Un email distinto en cada ejecución */
export function emailNuevo(prefijo = "e2e"): string {
  return `${prefijo}-${Date.now()}@prueba.test`;
}

/** La base de datos de las pruebas: la de DATABASE_URL acabada en "_e2e" (igual que playwright.config.ts) */
function urlBDPruebas(): string {
  return (process.env.DATABASE_URL ?? "").replace(
    /^(mongodb(?:\+srv)?:\/\/[^/]+)(?:\/([^?]*))?/,
    (_, base: string, bd?: string) => `${base}/${(bd || "valentia").replace(/_e2e$/, "")}_e2e`,
  );
}

/**
 * Abre la base de datos de las pruebas (nunca otra: comprueba que acaba en _e2e) y ejecuta "fn".
 * Sirve para preparar casos difíciles de crear desde la web (por ejemplo, una cuenta de hace 8 días).
 */
export async function conBD<T>(fn: (bd: Db) => Promise<T>): Promise<T> {
  const cliente = new MongoClient(urlBDPruebas());
  try {
    const bd = cliente.db();
    if (!bd.databaseName.endsWith("_e2e")) throw new Error("Solo en la base de datos de pruebas");
    return await fn(bd);
  } finally {
    await cliente.close();
  }
}

/** Vacía los límites de intentos (registros por IP…): las pruebas crean muchas cuentas seguidas */
export function vaciarLimites() {
  return conBD((bd) => bd.collection("LimiteIntento").deleteMany({}));
}

/** Registra una cuenta en /registro y espera a la pantalla del código (sin escribirlo) */
export async function registrar(
  pagina: Page,
  email: string,
  contrasena: string,
  nombre = "Pruebas",
) {
  await pagina.goto("/registro");
  await pagina.getByLabel("Nombre").fill(nombre);
  await pagina.getByLabel("Email").fill(email);
  await pagina.getByLabel("Contraseña").fill(contrasena);
  await pagina.getByRole("button", { name: "Crear mi cuenta" }).click();
  await pagina.waitForURL(/\/verificar/);
}

/** Inicia sesión en /login (no espera a ninguna página en concreto) */
export async function iniciarSesion(pagina: Page, email: string, contrasena: string) {
  await pagina.goto("/login");
  await pagina.getByLabel("Email").fill(email);
  await pagina.getByLabel("Contraseña").fill(contrasena);
  await pagina.getByRole("button", { name: "Iniciar sesión" }).click();
}
