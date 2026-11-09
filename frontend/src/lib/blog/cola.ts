/**
 * COLA DE PUBLICACIÓN: cuándo toca publicar, en hora de Madrid (sin base de datos).
 * n8n llama cada hora a /api/blog/publicar-cola; cada llamada publica como mucho un artículo,
 * a partir de la hora elegida y hasta llegar a los del día. Así un reinicio de Render no pierde nada.
 */
const ZONA = "Europe/Madrid";

const partes = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Día («2026-11-09») y minutos desde medianoche, en Madrid */
export function enMadrid(fecha: Date): { dia: string; minutos: number } {
  const p = Object.fromEntries(partes.formatToParts(fecha).map((x) => [x.type, x.value]));
  return { dia: `${p.year}-${p.month}-${p.day}`, minutos: Number(p.hour) * 60 + Number(p.minute) };
}

/** «10:00» → 600. Una hora mal escrita vale 10:00. */
export function minutosDeHora(hora: string): number {
  const m = hora.match(/^(\d{1,2}):(\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return 600;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** El momento exacto (UTC) de un día y una hora de Madrid */
export function fechaEnMadrid(dia: string, minutos: number): Date {
  const [y, m, d] = dia.split("-").map(Number);
  const supuesta = Date.UTC(y, m - 1, d, Math.floor(minutos / 60), minutos % 60);
  // Diferencia entre lo que marca el reloj de Madrid en ese momento y lo que queríamos
  const visto = enMadrid(new Date(supuesta));
  const [vy, vm, vd] = visto.dia.split("-").map(Number);
  const desfase = Date.UTC(vy, vm - 1, vd, 0, visto.minutos) - supuesta;
  return new Date(supuesta - desfase);
}

function sumarDias(dia: string, dias: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** ¿Hay que publicar ahora? (ya es la hora y hoy aún no se han publicado los del día) */
export function tocaPublicar(ahora: Date, hora: string, porDia: number, publicadosHoy: number) {
  return enMadrid(ahora).minutos >= minutosDeHora(hora) && publicadosHoy < porDia;
}

/**
 * Cuándo saldrá, más o menos, el artículo que está en la posición «puesto» de la cola (0 = el siguiente).
 * Cada día salen «porDia», uno por hora a partir de la hora elegida.
 */
export function cuandoSaldra(
  ahora: Date,
  hora: string,
  porDia: number,
  publicadosHoy: number,
  puesto: number,
): Date {
  const { dia, minutos } = enMadrid(ahora);
  const inicio = minutosDeHora(hora);
  const huecosHoy = Math.max(0, porDia - publicadosHoy);
  if (puesto < huecosHoy) {
    // Hoy: a la hora elegida (o en la próxima llamada de n8n, si ya ha pasado)
    const previsto = inicio + (publicadosHoy + puesto) * 60;
    const proximaLlamada = (Math.floor(minutos / 60) + 1) * 60;
    const cuando = Math.max(previsto, minutos >= inicio ? proximaLlamada + puesto * 60 : previsto);
    if (cuando < 24 * 60) return fechaEnMadrid(dia, cuando);
  }
  const resto = Math.max(0, puesto - huecosHoy);
  const dias = 1 + Math.floor(resto / Math.max(1, porDia));
  return fechaEnMadrid(sumarDias(dia, dias), inicio + (resto % Math.max(1, porDia)) * 60);
}
