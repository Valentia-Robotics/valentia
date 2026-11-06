/**
 * Ayudantes de las pruebas E2E.
 * Los correos de la web de pruebas no se envían: se guardan en .correos-dev/ (ver src/lib/correo).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

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
    .flatMap((a) => {
      // La web borra los correos más antiguos: uno puede desaparecer justo al ir a leerlo
      try {
        return [JSON.parse(readFileSync(path.join(CARPETA_CORREOS, a), "utf8")) as CorreoGuardado];
      } catch {
        return [];
      }
    })
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
