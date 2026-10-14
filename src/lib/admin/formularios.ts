/**
 * AYUDAS PARA LOS FORMULARIOS DEL PANEL
 * Todas las acciones del panel devuelven un "EstadoFormulario": si ha ido bien,
 * un mensaje, y si no, los errores de cada campo para enseñarlos junto a él.
 */
import { z } from "zod";

// Mensajes de error de validación en español
z.config(z.locales.es());

export interface EstadoFormulario {
  ok: boolean;
  /** Mensaje general (arriba del formulario) */
  mensaje?: string;
  /** Error de cada campo: { nombre: "Escribe un nombre", "pistas.0": "…" } */
  errores?: Record<string, string>;
}

export const estadoInicial: EstadoFormulario = { ok: false };

/** Convierte los errores de Zod en { campo: primer mensaje } */
export function erroresDeZod(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = problema.path.join(".") || "_";
    errores[campo] ??= problema.message;
  }
  return errores;
}

/** Respuesta estándar cuando el formulario tiene errores */
export function conErrores(error: z.ZodError): EstadoFormulario {
  const errores = erroresDeZod(error);
  return {
    ok: false,
    mensaje: errores._ ?? "Revisa los campos marcados en rojo.",
    errores,
  };
}

/** Lee un campo de texto de un formulario ("" si no viene) */
export function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

/** Lee todos los valores de texto de un campo repetido (por ejemplo, varias "opciones") */
export function textos(formulario: FormData, campo: string): string[] {
  return formulario.getAll(campo).filter((v): v is string => typeof v === "string");
}

/** Una casilla marcada llega como "on"; sin marcar, no llega */
export function casilla(formulario: FormData, campo: string): boolean {
  return formulario.get(campo) === "on";
}
