/**
 * Ayudas sin base de datos para las reseñas (se usan en la tienda, en el panel y en los tests).
 */
import { z } from "zod";
import { configResenas } from "@/config/resenas";

/** Lo que el cliente envía al escribir o cambiar su reseña */
export const esquemaResena = z.object({
  estrellas: z.coerce
    .number({ message: "Elige de 1 a 5 estrellas" })
    .int("Elige de 1 a 5 estrellas")
    .min(1, "Elige de 1 a 5 estrellas")
    .max(5, "Elige de 1 a 5 estrellas"),
  texto: z
    .string()
    .trim()
    .min(
      configResenas.textoMinimo,
      `Cuéntanos un poco más (al menos ${configResenas.textoMinimo} letras)`,
    )
    .max(configResenas.textoMaximo, `Máximo ${configResenas.textoMaximo} caracteres`),
});

/**
 * Nombre que se enseña en público: el nombre y la inicial del apellido ("Ana García" → "Ana G.").
 * Así la reseña es de una persona real, pero no se publica su nombre completo.
 */
export function nombrePublico(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Cliente";
  const [primero, segundo] = partes;
  return segundo ? `${primero} ${segundo[0].toUpperCase()}.` : primero;
}

/** Media de estrellas con un decimal (0 si no hay ninguna) */
export function mediaEstrellas(valores: number[]): number {
  if (valores.length === 0) return 0;
  const suma = valores.reduce((total, v) => total + v, 0);
  return Math.round((suma / valores.length) * 10) / 10;
}

const formatoMedia = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** "4,5" */
export const formatearMedia = (media: number) => formatoMedia.format(media);
