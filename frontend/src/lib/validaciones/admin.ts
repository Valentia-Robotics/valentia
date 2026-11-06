/**
 * Reglas de validación (con Zod) de los formularios del panel /admin.
 * Los formularios envían todo como texto: aquí se comprueba y se convierte
 * (por ejemplo, "24,90" € → 2490 céntimos). Los mensajes de error van en español.
 */
import { z } from "zod";
import { CATEGORIAS } from "./catalogo";
import { esquemaId } from "@/lib/ids";

// Mensajes de error de validación en español
z.config(z.locales.es());

/* ---------- Piezas pequeñas que se reutilizan ---------- */

/** Texto obligatorio con un máximo de caracteres */
export const textoObligatorio = (maximo: number) =>
  z
    .string({ error: "Este campo es obligatorio" })
    .trim()
    .min(1, "Este campo es obligatorio")
    .max(maximo, `Máximo ${maximo} caracteres`);

/** Texto opcional: si se deja vacío, se guarda null */
export const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Máximo ${maximo} caracteres`)
    .transform((v) => v || null);

/** Número escrito a la española (admite coma decimal: "3,3") */
const numero = z
  .string({ error: "Este campo es obligatorio" })
  .trim()
  .min(1, "Este campo es obligatorio")
  .transform((v) => Number(v.replace(",", ".")))
  .pipe(z.number({ error: "Escribe un número" }).refine(Number.isFinite, "Escribe un número"));

/** Número entero mayor o igual que "minimo" */
export const entero = (minimo = 0, maximo = 1_000_000) =>
  numero.pipe(
    z
      .number()
      .int("Tiene que ser un número entero (sin decimales)")
      .min(minimo, `Tiene que ser ${minimo} o más`)
      .max(maximo, `Tiene que ser ${maximo} o menos`),
  );

/** Número con decimales, 0 o más */
const decimal = numero.pipe(z.number().min(0, "No puede ser negativo").max(100_000));

/** Precio en euros ("24,90") → céntimos (2490) */
const eurosACentimos = (euros: z.ZodNumber) =>
  numero
    .pipe(euros.max(100_000, "Precio demasiado alto"))
    .refine((e) => Math.abs(e * 100 - Math.round(e * 100)) < 1e-6, "Máximo 2 decimales")
    .transform((e) => Math.round(e * 100));

export const precioEnCentimos = eurosACentimos(
  z.number().positive("El precio tiene que ser mayor que 0"),
);

/** Un kit sí puede valer 0: es un kit gratis */
const precioDeKitEnCentimos = eurosACentimos(z.number().min(0, "No puede ser negativo"));

/** Identificador para la dirección web: solo minúsculas, números y guiones */
export const slug = z
  .string()
  .trim()
  .min(2, "Mínimo 2 caracteres")
  .max(80, "Máximo 80 caracteres")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones (ej.: mi-componente)");

/** Convierte un nombre en slug: "Sensor de Línea TCRT5000" → "sensor-de-linea-tcrt5000" */
export function crearSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/* ---------- Componentes ---------- */

export const esquemaComponenteAdmin = z.object({
  nombre: textoObligatorio(80),
  categoria: z.enum(CATEGORIAS, { error: "Elige una categoría" }),
  tipo: z
    .string()
    .trim()
    .min(1, "Este campo es obligatorio")
    .max(40, "Máximo 40 caracteres")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones (ej.: motor-dc)"),
  resumen: textoObligatorio(160),
  descripcion: textoObligatorio(2000),
  precio: precioEnCentimos,
  stock: entero(0),
  voltaje: decimal,
  voltajeLogico: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .pipe(
      z
        .number({ error: "Escribe un número o déjalo vacío" })
        .positive("Tiene que ser mayor que 0")
        .max(48)
        .nullable(),
    ),
  consumoMa: entero(0),
  conector: textoObligatorio(60),
  pines: entero(0, 200),
  especificaciones: z
    .array(z.object({ nombre: textoObligatorio(40), valor: textoObligatorio(80) }))
    .max(20, "Máximo 20 datos técnicos"),
  visible: z.boolean(),
});

export type DatosComponenteAdmin = z.infer<typeof esquemaComponenteAdmin>;

/* ---------- Kits ---------- */

export const NIVELES = ["Principiante", "Intermedio", "Avanzado"] as const;

export const esquemaKitAdmin = z
  .object({
    nombre: textoObligatorio(80),
    eslogan: textoObligatorio(140),
    descripcion: textoObligatorio(3000),
    precio: precioDeKitEnCentimos,
    nivel: z.enum(NIVELES, { error: "Elige un nivel" }),
    edadMinima: entero(3, 99),
    tiempoMontaje: textoObligatorio(40),
    orden: entero(0, 999),
    destacado: z.boolean(),
    visible: z.boolean(),
    puntosFuertes: z
      .array(textoObligatorio(120))
      .min(1, "Añade al menos un punto fuerte")
      .max(8, "Máximo 8 puntos fuertes"),
    cursoId: z.string().min(1, "Elige el curso que incluye el kit").pipe(esquemaId),
    componentes: z
      .array(z.object({ id: esquemaId, cantidad: entero(1, 50) }))
      .refine(
        (piezas) => new Set(piezas.map((p) => p.id)).size === piezas.length,
        "Hay un componente repetido",
      ),
  })
  // Gratis = sin piezas (no hay nada que enviar); de pago = con piezas
  .refine((kit) => kit.precio === 0 || kit.componentes.length > 0, {
    path: ["componentes"],
    message: "Un kit de pago necesita al menos un componente",
  })
  .refine((kit) => kit.precio > 0 || kit.componentes.length === 0, {
    path: ["componentes"],
    message: "Un kit gratis no lleva piezas: quítalas o ponle precio",
  });

export type DatosKitAdmin = z.infer<typeof esquemaKitAdmin>;

/* ---------- Cursos, lecciones y ejercicios ---------- */

export const esquemaCursoAdmin = z.object({
  titulo: textoObligatorio(100),
  descripcion: textoObligatorio(2000),
  nivel: z.enum(NIVELES, { error: "Elige un nivel" }),
});

export const esquemaLeccionAdmin = z.object({
  titulo: textoObligatorio(120),
  descripcion: textoObligatorio(4000),
  duracionMin: entero(1, 600),
});

export const esquemaTestAdmin = z
  .object({
    enunciado: textoObligatorio(500),
    opciones: z
      .array(textoObligatorio(200))
      .min(2, "Un test necesita al menos 2 opciones")
      .max(6, "Máximo 6 opciones"),
    correcta: z
      .string({ error: "Marca cuál es la respuesta correcta" })
      .min(1, "Marca cuál es la respuesta correcta")
      .transform(Number),
    explicacion: textoObligatorio(1000),
  })
  .refine(
    (t) => Number.isInteger(t.correcta) && t.correcta >= 0 && t.correcta < t.opciones.length,
    {
      message: "Marca cuál es la respuesta correcta",
      path: ["correcta"],
    },
  );

export const esquemaRetoAdmin = z.object({
  enunciado: textoObligatorio(1000),
  pistas: z
    .array(textoObligatorio(500))
    .min(1, "Un reto necesita al menos una pista")
    .max(6, "Máximo 6 pistas"),
  solucion: textoObligatorio(4000),
});
