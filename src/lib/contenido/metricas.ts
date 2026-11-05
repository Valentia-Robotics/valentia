/**
 * MÉTRICAS POR EDITOR (solo para admins)
 * Salen del historial de cambios de estado, sin tocar la base de datos: así se pueden probar.
 *
 *   asignados    guiones distintos asignados a ese editor en el rango
 *   enProgreso   guiones que tiene en progreso AHORA MISMO (no depende del rango)
 *   entregados   guiones distintos cuya primera entrega cae en el rango
 *   completados  guiones distintos completados en el rango
 *   devueltos    veces que le devolvieron una entrega en el rango
 *   tiempo medio desde la asignación hasta la primera entrega
 *   a tiempo     primeras entregas hechas antes de que acabe el día de la fecha límite
 */
import type { EstadoGuion } from "@/generated/prisma/enums";

export interface EventoGuion {
  guionId: string;
  estadoAnterior: EstadoGuion | null;
  estadoNuevo: EstadoGuion;
  editorId: string | null;
  fecha: Date;
}

export interface GuionParaMetricas {
  id: string;
  estado: EstadoGuion;
  editorId: string | null;
  fechaLimite: Date;
}

export interface Rango {
  desde?: Date;
  hasta?: Date;
}

export interface MetricasEditor {
  editorId: string;
  asignados: number;
  enProgreso: number;
  entregados: number;
  completados: number;
  devueltos: number;
  /** null si todavía no hay entregas en el rango */
  tiempoMedioMs: number | null;
  aTiempo: number;
}

const DOCE_HORAS = 12 * 60 * 60_000;

/** La fecha límite se guarda a las 12:00 UTC: el día acaba 12 horas después */
export function finDelDia(fechaLimite: Date): Date {
  return new Date(fechaLimite.getTime() + DOCE_HORAS);
}

function vacias(editorId: string): MetricasEditor {
  return {
    editorId,
    asignados: 0,
    enProgreso: 0,
    entregados: 0,
    completados: 0,
    devueltos: 0,
    tiempoMedioMs: null,
    aTiempo: 0,
  };
}

export function calcularMetricas(
  eventos: EventoGuion[],
  guiones: GuionParaMetricas[],
  { desde, hasta }: Rango = {},
): MetricasEditor[] {
  const dentro = (fecha: Date) => (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
  const limites = new Map(guiones.map((g) => [g.id, g.fechaLimite]));
  const ordenados = [...eventos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  const porEditor = new Map<string, MetricasEditor>();
  const de = (editorId: string) => {
    const metricas = porEditor.get(editorId) ?? vacias(editorId);
    porEditor.set(editorId, metricas);
    return metricas;
  };

  const asignados = new Set<string>();
  const completados = new Set<string>();
  /** Última asignación de cada guion a cada editor, y guiones ya entregados por él */
  const ultimaAsignacion = new Map<string, Date>();
  const yaEntregados = new Set<string>();
  const tiempos = new Map<string, number[]>();

  for (const evento of ordenados) {
    if (!evento.editorId) continue;
    const metricas = de(evento.editorId);
    const clave = `${evento.editorId}:${evento.guionId}`;

    if (evento.estadoNuevo === "ASIGNADO") {
      ultimaAsignacion.set(clave, evento.fecha);
      if (dentro(evento.fecha) && !asignados.has(clave)) {
        asignados.add(clave);
        metricas.asignados++;
      }
    }

    if (evento.estadoNuevo === "ENTREGADO" && !yaEntregados.has(clave)) {
      yaEntregados.add(clave);
      if (dentro(evento.fecha)) {
        metricas.entregados++;
        const asignado = ultimaAsignacion.get(clave);
        if (asignado) {
          const lista = tiempos.get(evento.editorId) ?? [];
          lista.push(evento.fecha.getTime() - asignado.getTime());
          tiempos.set(evento.editorId, lista);
        }
        const limite = limites.get(evento.guionId);
        if (limite && evento.fecha <= finDelDia(limite)) metricas.aTiempo++;
      }
    }

    if (evento.estadoNuevo === "COMPLETADO" && dentro(evento.fecha) && !completados.has(clave)) {
      completados.add(clave);
      metricas.completados++;
    }

    if (
      evento.estadoAnterior === "ENTREGADO" &&
      evento.estadoNuevo === "EN_PROGRESO" &&
      dentro(evento.fecha)
    ) {
      metricas.devueltos++;
    }
  }

  for (const guion of guiones) {
    if (guion.estado === "EN_PROGRESO" && guion.editorId) de(guion.editorId).enProgreso++;
  }
  for (const [editorId, lista] of tiempos) {
    de(editorId).tiempoMedioMs = lista.reduce((suma, t) => suma + t, 0) / lista.length;
  }
  return [...porEditor.values()];
}

/** 183600000 → "2 d 3 h"; menos de una hora → "menos de 1 h" */
export function duracionLegible(ms: number): string {
  const horas = Math.floor(ms / 3_600_000);
  if (horas < 1) return "menos de 1 h";
  const dias = Math.floor(horas / 24);
  return dias > 0 ? `${dias} d ${horas % 24} h` : `${horas} h`;
}
