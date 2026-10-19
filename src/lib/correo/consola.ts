/**
 * CARTERO DE DESARROLLO
 * No envía nada de verdad: escribe el correo en la terminal (donde corre "npm run dev")
 * y lo guarda en la carpeta .correos-dev/ para verlo bonito en /dev/correos.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Correo, ProveedorCorreo } from "./tipos";

/** Carpeta donde se guardan los correos de prueba (fuera de git) */
const CARPETA = path.join(process.cwd(), ".correos-dev");
/** Solo se guardan los últimos correos, para que la carpeta no crezca sin fin */
const MAXIMO_GUARDADOS = 50;

export interface CorreoGuardado extends Correo {
  id: string;
  enviadoEn: string;
}

export const correoConsola: ProveedorCorreo = {
  nombre: "consola",
  async enviar(correo) {
    const linea = "─".repeat(60);
    console.log(
      `\n${linea}\n✉  CORREO (no se ha enviado de verdad)\n   Para:   ${correo.para}\n` +
        `   Asunto: ${correo.asunto}\n${linea}\n${correo.texto}\n${linea}\n` +
        `   Míralo con su diseño en http://localhost:3000/dev/correos\n`,
    );

    // En Vercel (vistas previas sin Resend) no se puede escribir en disco: el correo queda solo
    // en los registros (Logs) del proyecto, que únicamente ve el equipo
    if (process.env.VERCEL) return;

    // El nombre empieza por la fecha: así ordenarlos es ordenar los nombres
    const enviadoEn = new Date().toISOString();
    const id = `${Date.now()}-${randomBytes(3).toString("hex")}`;
    const guardado: CorreoGuardado = { id, enviadoEn, ...correo };
    await mkdir(CARPETA, { recursive: true });
    await writeFile(path.join(CARPETA, `${id}.json`), JSON.stringify(guardado, null, 2));

    // Borramos los más antiguos si hay demasiados
    const archivos = (await readdir(CARPETA)).filter((a) => a.endsWith(".json")).sort();
    for (const viejo of archivos.slice(0, -MAXIMO_GUARDADOS)) {
      await rm(path.join(CARPETA, viejo), { force: true });
    }
  },
};

/** Los correos guardados, del más nuevo al más antiguo (para /dev/correos) */
export async function leerCorreosGuardados(): Promise<CorreoGuardado[]> {
  let archivos: string[];
  try {
    archivos = (await readdir(CARPETA)).filter((a) => a.endsWith(".json"));
  } catch {
    return []; // todavía no se ha enviado ninguno
  }
  archivos.sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
  const correos = await Promise.all(
    archivos.map(async (archivo) => {
      try {
        return JSON.parse(await readFile(path.join(CARPETA, archivo), "utf8")) as CorreoGuardado;
      } catch {
        return null; // archivo a medio escribir o estropeado: lo saltamos
      }
    }),
  );
  return correos.filter((c): c is CorreoGuardado => c !== null);
}

/** Vacía la bandeja de /dev/correos */
export async function borrarCorreosGuardados(): Promise<void> {
  await rm(CARPETA, { recursive: true, force: true });
}
