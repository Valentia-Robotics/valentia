/**
 * Validación del valor de la empresa que se escribe en /admin/acciones.
 * Llega como texto: "250.000" o "250000,50" € → céntimos.
 */
import { z } from "zod";

z.config(z.locales.es());

/** Mil millones de euros: más que eso es un error al escribir */
const MAXIMO_EUROS = 1_000_000_000;

export const esquemaValoracion = z.object({
  importe: z
    .string()
    .trim()
    .min(1, "Escribe cuánto vale la empresa")
    // Admite "1.234,56", "1234,56", "1234.56" y "250.000"
    .transform((v) =>
      v.includes(",")
        ? v.replaceAll(".", "").replace(",", ".")
        : /^\d{1,3}(\.\d{3})+$/.test(v)
          ? v.replaceAll(".", "")
          : v,
    )
    .transform(Number)
    .pipe(
      z
        .number({ error: "Escribe un número" })
        .refine(Number.isFinite, "Escribe un número")
        .refine((e) => e > 0, "Tiene que ser mayor que 0")
        .refine((e) => e <= MAXIMO_EUROS, "Valor demasiado alto")
        .refine((e) => Math.abs(e * 100 - Math.round(e * 100)) < 1e-6, "Máximo 2 decimales"),
    )
    .transform((e) => Math.round(e * 100)),
  nota: z.string().trim().max(200, "Máximo 200 caracteres"),
});
