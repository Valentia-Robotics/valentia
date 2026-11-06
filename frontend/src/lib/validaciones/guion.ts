/**
 * VALIDACIÓN DE LOS GUIONES (panel de admin y panel de editor)
 */
import { z } from "zod";
import { esquemaId } from "@/lib/ids";

const obligatorio = (maximo: number) =>
  z.string().trim().min(1, "Este campo es obligatorio").max(maximo, `Máximo ${maximo} caracteres`);

/** Día elegido ("2026-11-30") → las 12:00 UTC de ese día */
const fechaLimite = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha")
  .transform((dia) => new Date(`${dia}T12:00:00.000Z`))
  .refine((fecha) => !Number.isNaN(fecha.getTime()), "Elige una fecha");

export const esquemaGuion = z
  .object({
    titulo: obligatorio(140),
    categoriaId: z.string().min(1, "Elige una categoría").pipe(esquemaId),
    plataforma: z.enum(["VIDEO_CORTO", "YOUTUBE_LARGO", "OTRA"], { error: "Elige una plataforma" }),
    plataformaOtra: z.string().trim().max(60, "Máximo 60 caracteres"),
    duracionObjetivo: obligatorio(40),
    gancho: obligatorio(600),
    desarrollo: obligatorio(10_000),
    llamadaAccion: obligatorio(600),
    notasVisuales: obligatorio(5000),
    kitId: z.union([z.literal(""), esquemaId]),
    fechaLimite,
  })
  .refine((g) => g.plataforma !== "OTRA" || g.plataformaOtra.length > 0, {
    path: ["plataformaOtra"],
    message: "Escribe en qué plataforma se publicará",
  })
  .transform(({ kitId, plataformaOtra, ...g }) => ({
    ...g,
    kitId: kitId || null,
    plataformaOtra: g.plataforma === "OTRA" ? plataformaOtra : null,
  }));

export type DatosGuion = z.infer<typeof esquemaGuion>;

/** Enlace del vídeo terminado: solo direcciones web normales */
export const esquemaEnlaceVideo = z
  .string()
  .trim()
  .max(1000, "Enlace demasiado largo")
  .refine((valor) => {
    try {
      return ["http:", "https:"].includes(new URL(valor).protocol);
    } catch {
      return false;
    }
  }, "Pega el enlace completo, empezando por https://");

export const esquemaNotasEditor = z.string().max(20_000, "Máximo 20.000 caracteres");

export const esquemaComentario = z.string().trim().max(3000, "Máximo 3000 caracteres");

export const esquemaCategoria = obligatorio(60);
