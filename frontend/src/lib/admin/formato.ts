/**
 * Fechas del panel, siempre en hora de España.
 */
const zona = "Europe/Madrid";

const formatoFecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: zona });
const formatoFechaHora = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: zona,
});

/** 14 oct 2026 */
export const fecha = (d: Date) => formatoFecha.format(d);
/** 14 oct 2026, 21:05 */
export const fechaHora = (d: Date) => formatoFechaHora.format(d);

/** Porcentaje redondeado: (3, 4) → "75 %". Si el total es 0, "—". */
export function porcentaje(parte: number, total: number): string {
  return total === 0 ? "—" : `${Math.round((parte / total) * 100)} %`;
}

/** Día 1 del mes actual a las 00:00 (hora del servidor), para "nuevos este mes" */
export function inicioDelMes(ahora = new Date()): Date {
  return new Date(ahora.getFullYear(), ahora.getMonth(), 1);
}
