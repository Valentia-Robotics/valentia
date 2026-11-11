/**
 * GUIONES DE MARKETING: estados, quién puede mover cada uno y textos.
 * Todas las reglas del flujo están aquí, como datos: el servidor las comprueba en cada cambio
 * (src/lib/contenido/guiones.ts) y el panel solo las usa para decidir qué botones enseña.
 *
 *   borrador → pendiente de aprobación → aprobado → asignado → en progreso → entregado → completado
 *
 * El admin puede corregir un guion hasta que lo asigna: lo devuelve a borrador y vuelve a aprobarlo.
 * Desde «entregado», el admin puede devolverlo a «en progreso» con un comentario de cambios.
 * Un automático sin editor se puede «descartar»: queda guardado como DESCARTADO (no se borra) y se puede
 * recuperar, que lo devuelve a «pendiente de aprobación».
 */
import type { EstadoGuion, PlataformaGuion } from "@/generated/prisma/enums";

export const estadosGuion: Record<
  EstadoGuion,
  { nombre: string; tono: "neutro" | "aviso" | "acento" | "exito" }
> = {
  BORRADOR: { nombre: "Borrador", tono: "neutro" },
  PENDIENTE_APROBACION: { nombre: "Pendiente de aprobación", tono: "aviso" },
  APROBADO: { nombre: "Aprobado", tono: "acento" },
  ASIGNADO: { nombre: "Asignado", tono: "acento" },
  EN_PROGRESO: { nombre: "En progreso", tono: "aviso" },
  ENTREGADO: { nombre: "Entregado", tono: "acento" },
  COMPLETADO: { nombre: "Completado", tono: "exito" },
  DESCARTADO: { nombre: "Descartado", tono: "neutro" },
};

/** Los estados en el orden del flujo (columnas del tablero). Descartado va aparte: no es un paso */
export const ORDEN_ESTADOS = (Object.keys(estadosGuion) as EstadoGuion[]).filter(
  (e) => e !== "DESCARTADO",
);

export const plataformasGuion: Record<PlataformaGuion, string> = {
  VIDEO_CORTO: "TikTok / Reels / Shorts",
  YOUTUBE_LARGO: "YouTube largo",
  OTRA: "Otra",
};

/** Categorías con las que empieza la lista (el admin puede añadir más) */
export const CATEGORIAS_INICIALES = [
  "Robótica",
  "Inteligencia Artificial",
  "Electrónica",
  "Programación",
  "Impresión 3D",
  "Gadgets y tecnología",
  "Proyectos maker",
];

/**
 * ADMIN = administración · EDITOR = el editor que tiene el guion asignado ·
 * AUTOR = el editor que escribió una idea propia (origen EDITOR), mientras aún no está aprobada
 */
export type ActorGuion = "ADMIN" | "EDITOR" | "AUTOR";

/** Cambios de estado permitidos y quién puede hacerlos. Asignar tiene su propia función. */
const TRANSICIONES: { de: EstadoGuion; a: EstadoGuion; quien: ActorGuion }[] = [
  { de: "BORRADOR", a: "PENDIENTE_APROBACION", quien: "ADMIN" },
  { de: "PENDIENTE_APROBACION", a: "APROBADO", quien: "ADMIN" },
  { de: "PENDIENTE_APROBACION", a: "BORRADOR", quien: "ADMIN" },
  { de: "APROBADO", a: "BORRADOR", quien: "ADMIN" },
  { de: "ASIGNADO", a: "EN_PROGRESO", quien: "EDITOR" },
  { de: "EN_PROGRESO", a: "ENTREGADO", quien: "EDITOR" },
  { de: "ENTREGADO", a: "COMPLETADO", quien: "ADMIN" },
  { de: "ENTREGADO", a: "EN_PROGRESO", quien: "ADMIN" },
  // Ideas propias del editor: las envía a revisión, las retira para seguir escribiendo,
  // las archiva (no se borran) y las recupera
  { de: "BORRADOR", a: "PENDIENTE_APROBACION", quien: "AUTOR" },
  { de: "PENDIENTE_APROBACION", a: "BORRADOR", quien: "AUTOR" },
  { de: "BORRADOR", a: "DESCARTADO", quien: "AUTOR" },
  { de: "DESCARTADO", a: "BORRADOR", quien: "AUTOR" },
];

export function puedeCambiar(de: EstadoGuion, a: EstadoGuion, quien: ActorGuion): boolean {
  return TRANSICIONES.some((t) => t.de === de && t.a === a && t.quien === quien);
}

/** Devolver una entrega exige explicar qué hay que cambiar */
export function exigeComentario(de: EstadoGuion, a: EstadoGuion): boolean {
  return de === "ENTREGADO" && a === "EN_PROGRESO";
}

/** El texto solo se puede editar antes de aprobarlo (y solo lo edita el admin) */
export const ESTADOS_EDITABLES: EstadoGuion[] = ["BORRADOR", "PENDIENTE_APROBACION"];

/** Se puede asignar un guion aprobado, y reasignar uno que aún no se ha entregado */
export const ESTADOS_ASIGNABLES: EstadoGuion[] = ["APROBADO", "ASIGNADO", "EN_PROGRESO"];

/** Estados en los que un editor ve el guion */
export const ESTADOS_DEL_EDITOR: EstadoGuion[] = [
  "ASIGNADO",
  "EN_PROGRESO",
  "ENTREGADO",
  "COMPLETADO",
];

/** El editor puede escribir en su zona de trabajo mientras el guion está en sus manos */
export const ESTADOS_DE_TRABAJO: EstadoGuion[] = ["ASIGNADO", "EN_PROGRESO"];

/** Con guiones en estos estados no se le puede quitar el rol a un editor: antes hay que reasignarlos */
export const ESTADOS_ACTIVOS: EstadoGuion[] = ["ASIGNADO", "EN_PROGRESO", "ENTREGADO"];

/**
 * Estados en los que el editor ve sus ideas propias (origen EDITOR, escritas por él) mientras nadie
 * se las asigna. Aprobada y asignada, la idea pasa a ser un guion asignado más.
 */
export const ESTADOS_PROPIOS: EstadoGuion[] = [
  "BORRADOR",
  "PENDIENTE_APROBACION",
  "APROBADO",
  "DESCARTADO",
];

/** El autor solo cambia el texto de su idea mientras es borrador (enviada, la revisa administración) */
export const ESTADOS_EDITABLES_AUTOR: EstadoGuion[] = ["BORRADOR"];

/**
 * PASOS DE EDICIÓN: la lista que el editor va marcando mientras trabaja un guion (se guarda en
 * Guion.pasosHechos). Para añadir un paso, añádelo aquí; nunca cambies un id que ya se usa.
 */
export const PASOS_EDICION: { id: string; texto: string }[] = [
  { id: "leido", texto: "Guion leído y dudas resueltas" },
  { id: "material", texto: "Material grabado o reunido" },
  { id: "montaje", texto: "Montaje" },
  { id: "subtitulos", texto: "Subtítulos" },
  { id: "sonido", texto: "Música y sonido" },
  { id: "miniatura", texto: "Portada o miniatura" },
  { id: "revision", texto: "Revisión final" },
];

/** Solo los ids que existen, sin repetir y en el orden de la lista */
export function limpiarPasos(ids: string[]): string[] {
  return PASOS_EDICION.map((p) => p.id).filter((id) => ids.includes(id));
}

const DIA = 86_400_000;
const diaUTC = (fecha: Date) =>
  Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()) / DIA;

/**
 * Cuánto queda para la fecha límite, dicho para una persona. La fecha límite se guarda a las
 * 12:00 UTC del día elegido; se comparan días enteros. Los guiones ya entregados no corren prisa.
 */
export function urgenciaGuion(
  fechaLimite: Date,
  estado: EstadoGuion,
  ahora = new Date(),
): { texto: string; tono: "neutro" | "aviso" | "error" | "exito" } | null {
  if (estado === "ENTREGADO" || estado === "COMPLETADO" || estado === "DESCARTADO") return null;
  const dias = diaUTC(fechaLimite) - diaUTC(ahora);
  if (dias < 0) {
    const n = -dias;
    return { texto: `Retrasado ${n} ${n === 1 ? "día" : "días"}`, tono: "error" };
  }
  if (dias === 0) return { texto: "Vence hoy", tono: "error" };
  if (dias === 1) return { texto: "Vence mañana", tono: "aviso" };
  if (dias <= 7) return { texto: `Quedan ${dias} días`, tono: "aviso" };
  return { texto: `Quedan ${dias} días`, tono: "neutro" };
}

/** Palabras que se leen en voz alta por minuto (ritmo tranquilo de vídeo divulgativo) */
export const PALABRAS_POR_MINUTO = 150;

/** Palabras del texto que se dice (gancho, desarrollo y llamada a la acción) y cuánto se tarda */
export function tiempoLectura(textos: string[]): { palabras: number; segundos: number } {
  const palabras = textos.join(" ").split(/\s+/).filter(Boolean).length;
  return { palabras, segundos: Math.round((palabras / PALABRAS_POR_MINUTO) * 60) };
}

/** 95 → «1 min 35 s», 40 → «40 s» */
export function textoDuracion(segundos: number): string {
  if (segundos < 60) return `${segundos} s`;
  const min = Math.floor(segundos / 60);
  const s = segundos % 60;
  return s ? `${min} min ${s} s` : `${min} min`;
}
