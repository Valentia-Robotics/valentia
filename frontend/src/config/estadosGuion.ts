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

export type ActorGuion = "ADMIN" | "EDITOR";

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
