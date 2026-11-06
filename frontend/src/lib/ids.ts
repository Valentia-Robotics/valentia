/**
 * IDS DE MONGODB
 * Cada documento tiene un id de 24 caracteres hexadecimales (ObjectId). Si a Prisma le llega un id
 * con otra forma, lanza un error en vez de decir "no existe": por eso los ids que vienen de la
 * dirección de la página o de un formulario se comprueban antes con esId().
 */
import { z } from "zod";

const FORMATO_ID = /^[0-9a-f]{24}$/;

/** true si el valor tiene forma de id de MongoDB */
export function esId(valor: unknown): valor is string {
  return typeof valor === "string" && FORMATO_ID.test(valor);
}

/** Validación de Zod para un id de MongoDB */
export const esquemaId = z.string().regex(FORMATO_ID, "Identificador no válido");

/** true si cada valor está vacío (algo nuevo, sin id todavía) o tiene forma de id */
export function idsValidos(...valores: string[]): boolean {
  return valores.every((v) => v === "" || esId(v));
}
