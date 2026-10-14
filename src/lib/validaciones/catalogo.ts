/**
 * Reglas de validación (con Zod) para los datos de data/*.json.
 * Si escribes algo mal en esos archivos (un precio con texto, una categoría
 * que no existe…), el seed se detiene y te dice exactamente qué y dónde.
 */
import { z } from "zod";

export const CATEGORIAS = [
  "PLACAS",
  "MOTORES",
  "SENSORES",
  "ALIMENTACION",
  "CHASIS",
  "EXTRAS",
] as const;

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones (ej.: mi-componente)");

const precio = z.number().positive("El precio debe ser mayor que 0");

const rutaImagen = z.string().startsWith("/images/", "La imagen debe empezar por /images/");

export const esquemaComponente = z.object({
  slug,
  nombre: z.string().min(1),
  categoria: z.enum(CATEGORIAS),
  tipo: z.string().min(1),
  resumen: z.string().min(1),
  descripcion: z.string().min(1),
  precio,
  stock: z.number().int().min(0),
  imagen: rutaImagen,
  voltaje: z.number().min(0),
  voltajeLogico: z.number().positive().nullable(),
  consumoMa: z.number().int().min(0),
  conector: z.string().min(1),
  pines: z.number().int().min(0),
  especificaciones: z.array(z.object({ nombre: z.string(), valor: z.string() })),
});

export const esquemaKit = z.object({
  slug,
  nombre: z.string().min(1),
  eslogan: z.string().min(1),
  descripcion: z.string().min(1),
  precio,
  imagen: rutaImagen,
  nivel: z.string().min(1),
  edadMinima: z.number().int().positive(),
  tiempoMontaje: z.string().min(1),
  destacado: z.boolean(),
  orden: z.number().int(),
  puntosFuertes: z.array(z.string()),
  /** slug del curso que incluye el kit */
  curso: slug,
  componentes: z
    .array(z.object({ slug, cantidad: z.number().int().positive() }))
    .min(1, "Un kit necesita al menos un componente"),
});

const esquemaEjercicio = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("TEST"),
    enunciado: z.string().min(1),
    opciones: z.array(z.string()).min(2, "Un test necesita al menos 2 opciones"),
    correcta: z.number().int().min(0),
    explicacion: z.string().min(1),
  }),
  z.object({
    tipo: z.literal("RETO"),
    enunciado: z.string().min(1),
    pistas: z.array(z.string()).min(1),
    solucion: z.string().min(1),
  }),
]);

export const esquemaCurso = z.object({
  slug,
  titulo: z.string().min(1),
  descripcion: z.string().min(1),
  nivel: z.string().min(1),
  lecciones: z
    .array(
      z.object({
        slug,
        titulo: z.string().min(1),
        descripcion: z.string().min(1),
        /** URL del vídeo, o "PENDIENTE" mientras no exista */
        videoUrl: z.union([z.literal("PENDIENTE"), z.url()]),
        duracionMin: z.number().int().positive(),
        ejercicios: z.array(esquemaEjercicio),
      }),
    )
    .min(1),
});

export type DatosComponente = z.infer<typeof esquemaComponente>;
export type DatosKit = z.infer<typeof esquemaKit>;
export type DatosCurso = z.infer<typeof esquemaCurso>;
