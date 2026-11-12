/**
 * CORREOS DE NOVEDADES (kits nuevos, lanzamientos…)
 * Reglas puras: quién los recibe, cómo se valida lo que escribe el admin y cómo se parte el texto.
 * La base de datos y el envío están en src/lib/novedades/.
 *
 * La ley española (LSSI, art. 21) solo deja mandar publicidad por correo a quien lo ha aceptado
 * antes. Por eso se mandan SOLO a quien marcó «Quiero recibir novedades» (al registrarse o en
 * «Mi cuenta») y cada correo lleva su enlace para darse de baja con un clic.
 */
import { z } from "zod";

/**
 * ¿Recibe los correos? true = dijo que sí · false = dijo que no · null = aún no lo ha dicho.
 * Solo los que dijeron que sí (ver arriba).
 */
export function recibeNovedades(novedades: boolean | null | undefined): boolean {
  return novedades === true;
}

/** Filtro de la base de datos con el mismo criterio (solo cuentas con el email confirmado) */
export const FILTRO_DESTINATARIOS = {
  novedades: true,
  emailVerificadoEn: { not: null },
} as const;

/** Entre correo y correo (Resend admite 2 por segundo en el plan normal) */
export const ESPERA_ENTRE_CORREOS_MS = 600;

/** Si un envío lleva este rato sin avanzar y no ha terminado, es que se cortó (p. ej., al publicar) */
export const MINUTOS_PARA_CORTADO = 5;

/** ¿Se cortó a medias? (se puede seguir desde donde se quedó) */
export function envioCortado(
  correo: { terminadoEn: Date | null; avanceEn: Date },
  ahora = new Date(),
): boolean {
  return (
    !correo.terminadoEn &&
    ahora.getTime() - correo.avanceEn.getTime() > MINUTOS_PARA_CORTADO * 60_000
  );
}

/** Parte el texto en párrafos (una línea en blanco = párrafo nuevo; un salto suelto se respeta) */
export function parrafosDeTexto(texto: string): string[][] {
  return texto
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    )
    .filter((lineas) => lineas.length > 0);
}

/** Dirección del botón: de la propia web (/kits/…) o una completa con https:// */
const direccionBoton = z
  .string()
  .trim()
  .max(500, "Esa dirección es demasiado larga")
  .refine(
    // Sin espacios ni comillas: la dirección va tal cual dentro del HTML del correo
    (url) => /^(\/(?!\/)[^\s"'<>]*|https:\/\/[^\s"'<>]+)$/i.test(url),
    "Escribe una dirección de la web (empieza por /, como /kits) o una completa que empiece por https://",
  );

/** Lo que escribe el admin en /admin/correos */
export const esquemaCorreoNovedades = z
  .object({
    asunto: z
      .string()
      .trim()
      .min(3, "Escribe el asunto (lo que se ve en la bandeja de entrada)")
      .max(120, "El asunto es demasiado largo (máximo 120 letras)"),
    titulo: z
      .string()
      .trim()
      .min(3, "Escribe un título")
      .max(120, "El título es demasiado largo (máximo 120 letras)"),
    texto: z
      .string()
      .trim()
      .min(10, "Escribe el texto del correo")
      .max(5000, "El texto es demasiado largo (máximo 5.000 letras)"),
    botonTexto: z.string().trim().max(40, "El texto del botón es demasiado largo (máximo 40)"),
    botonUrl: z.union([z.literal(""), direccionBoton]),
  })
  .superRefine((d, ctx) => {
    if (d.botonTexto && !d.botonUrl) {
      ctx.addIssue({ code: "custom", path: ["botonUrl"], message: "¿A dónde lleva el botón?" });
    }
    if (d.botonUrl && !d.botonTexto) {
      ctx.addIssue({ code: "custom", path: ["botonTexto"], message: "Escribe el texto del botón" });
    }
  });

export type DatosCorreoNovedades = z.infer<typeof esquemaCorreoNovedades>;

/** Primer nombre de la persona («Ana García» → «Ana»); sin nombre, «hola» */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || "hola";
}

/** Cambia cada [nombre] del texto (también [Nombre] o [NOMBRE]) por el nombre de quien lo recibe */
export function ponerNombre(texto: string, nombre: string): string {
  return texto.replace(/\[nombre\]/gi, () => primerNombre(nombre));
}
