/**
 * GUIONES AUTOMÁTICOS (n8n): qué se acepta y cómo se limpia.
 * Lo escribe una IA, así que todo el texto se limpia (sin etiquetas HTML ni caracteres de control)
 * y lo que sobra se ignora. Solo es obligatorio: titulo, al menos una escena y fuente.url.
 * El formato completo está en backend/n8n/README.md.
 */
import { z } from "zod";

/** Quita etiquetas HTML y caracteres invisibles de control. React ya escapa al pintar: esto es otra capa. */
export function limpiarTexto(valor: string): string {
  return valor
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

/** Misma noticia con otra «cola» (#ancla, utm_…) = misma noticia */
export function normalizarUrl(url: string): string {
  const u = new URL(url);
  u.hash = "";
  for (const clave of [...u.searchParams.keys()]) {
    if (clave.toLowerCase().startsWith("utm_")) u.searchParams.delete(clave);
  }
  return u.toString();
}

const falta = (mensaje: string) => (iss: { input: unknown }) =>
  iss.input === undefined || iss.input === null ? mensaje : "Tipo de dato no válido";

const texto = (maximo: number, mensajeFalta = "Este campo es obligatorio") =>
  z
    .string({ error: falta(mensajeFalta) })
    .transform(limpiarTexto)
    .pipe(z.string().max(maximo, `Máximo ${maximo} caracteres`));

const textoOpcional = (maximo: number) => texto(maximo).optional();

/** Una fecha que no se entiende no tumba el guion: es un dato secundario */
const fechaOpcional = z
  .string()
  .optional()
  .transform((valor) => {
    if (!valor) return undefined;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? undefined : fecha;
  })
  .catch(undefined);

const segundos = z.coerce.number().int().min(0).max(3600).optional().catch(undefined);

const escena = z
  .object({
    orden: z.coerce.number().int().min(1).max(200).optional().catch(undefined),
    duracionSegundos: segundos,
    voz: textoOpcional(2000).default(""),
    visual: textoOpcional(2000).default(""),
    textoPantalla: textoOpcional(300),
  })
  .refine((e) => e.voz || e.visual, "Cada escena necesita «voz» o «visual»");

const urlNoticia = z
  .string({ error: falta("Falta la URL de la noticia (fuente.url)") })
  .trim()
  .max(2000, "La URL es demasiado larga")
  .refine((valor) => {
    try {
      return ["http:", "https:"].includes(new URL(valor).protocol);
    } catch {
      return false;
    }
  }, "fuente.url tiene que ser una dirección completa, empezando por https://");

const listaDeTextos = (cuantos: number, maximo: number) =>
  z
    .array(z.string())
    .max(cuantos, `Como mucho ${cuantos}`)
    .optional()
    .transform((lista) =>
      [...new Set((lista ?? []).map((t) => limpiarTexto(t).slice(0, maximo)))].filter(Boolean),
    );

export const esquemaGuionAutomatico = z.object({
  titulo: texto(140, "Falta el título (titulo)").pipe(z.string().min(1, "El título está vacío")),
  gancho: textoOpcional(600),
  duracionSegundos: segundos,
  escenas: z
    .array(escena, { error: falta("Faltan las escenas: hace falta al menos una") })
    .min(1, "Hace falta al menos una escena")
    .max(40, "Como mucho 40 escenas"),
  cierreCta: textoOpcional(600),
  descripcionRedes: textoOpcional(2200),
  hashtags: listaDeTextos(30, 60).transform((lista) =>
    lista.map((h) => h.replace(/^#+/, "").replace(/\s+/g, "")).filter(Boolean),
  ),
  nivel: textoOpcional(40),
  conexionValentia: textoOpcional(1000),
  datosAVerificar: listaDeTextos(30, 500),
  relevancia: z.coerce.number().min(1).max(10).transform(Math.round).optional().catch(undefined),
  textoCompleto: textoOpcional(10_000),
  fuente: z.object(
    {
      url: urlNoticia,
      titulo: textoOpcional(300),
      medio: textoOpcional(120),
      fecha: fechaOpcional,
    },
    { error: falta("Falta la noticia de origen (fuente.url)") },
  ),
  modelo: textoOpcional(80),
  generadoEn: fechaOpcional,
  /** Opcionales: si no vienen, «Robótica» y ningún kit */
  categoria: textoOpcional(60),
  kit: textoOpcional(80),
});

export type GuionAutomatico = z.infer<typeof esquemaGuionAutomatico>;
