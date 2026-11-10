/**
 * Validación del formulario de ingresos y gastos (/admin/finanzas).
 * Llega todo como texto: "24,90" € → 2490 céntimos; "2026-11-10" → fecha.
 */
import { z } from "zod";
import { categoriasDe, fechaDeDia, ivaIncluido, TIPOS_IVA } from "@/config/finanzas";
import { textoObligatorio } from "./admin";

z.config(z.locales.es());

const MAXIMO_EUROS = 10_000_000;

const textoLibre = (maximo: number) => z.string().trim().max(maximo, `Máximo ${maximo} caracteres`);

export const esquemaMovimiento = z
  .object({
    tipo: z.enum(["INGRESO", "GASTO"], { error: "Elige si es un ingreso o un gasto" }),
    concepto: textoObligatorio(120),
    categoria: z.string().min(1, "Elige una categoría"),
    importe: z
      .string()
      .trim()
      .min(1, "Escribe el importe")
      // Admite "1.234,56", "1234,56" y "1234.56"
      .transform((v) => (v.includes(",") ? v.replaceAll(".", "").replace(",", ".") : v))
      .transform(Number)
      .pipe(
        z
          .number({ error: "Escribe un número" })
          .refine(Number.isFinite, "Escribe un número")
          .refine((e) => e > 0, "El importe tiene que ser mayor que 0")
          .refine((e) => e <= MAXIMO_EUROS, "Importe demasiado alto")
          .refine((e) => Math.abs(e * 100 - Math.round(e * 100)) < 1e-6, "Máximo 2 decimales"),
      )
      .transform((e) => Math.round(e * 100)),
    iva: z
      .string()
      .transform(Number)
      .refine((v) => (TIPOS_IVA as readonly number[]).includes(v), "Elige el IVA"),
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha")
      .refine((d) => !Number.isNaN(fechaDeDia(d).getTime()), "Fecha no válida")
      .refine((d) => d >= "2020-01-01" && d <= "2099-12-31", "Fecha no válida"),
    contraparte: textoLibre(80),
    notas: textoLibre(500),
  })
  .refine((m) => categoriasDe(m.tipo).some((c) => c.slug === m.categoria), {
    path: ["categoria"],
    message: "Elige una categoría de la lista",
  })
  .transform((m) => ({
    tipo: m.tipo,
    concepto: m.concepto,
    categoria: m.categoria,
    importeCentimos: m.importe,
    ivaPorcentaje: m.iva,
    ivaCentimos: ivaIncluido(m.importe, m.iva),
    fecha: fechaDeDia(m.fecha),
    contraparte: m.contraparte,
    notas: m.notas,
  }));

export type DatosMovimiento = z.output<typeof esquemaMovimiento>;
