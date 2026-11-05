import { describe, expect, it } from "vitest";
import type { EstadoGuion } from "@/generated/prisma/enums";
import { calcularMetricas, duracionLegible, type EventoGuion } from "./metricas";

const dia = (d: number, hora = 10) => new Date(Date.UTC(2026, 10, d, hora));
const evento = (
  guionId: string,
  estadoAnterior: EstadoGuion | null,
  estadoNuevo: EstadoGuion,
  editorId: string | null,
  fecha: Date,
): EventoGuion => ({ guionId, estadoAnterior, estadoNuevo, editorId, fecha });

/** Guion g1: asignado el día 1, entregado el 3, devuelto el 4, entregado el 5 y completado el 6 */
const historia = [
  evento("g1", "BORRADOR", "PENDIENTE_APROBACION", null, dia(1, 8)),
  evento("g1", "APROBADO", "ASIGNADO", "ana", dia(1)),
  evento("g1", "ASIGNADO", "EN_PROGRESO", "ana", dia(2)),
  evento("g1", "EN_PROGRESO", "ENTREGADO", "ana", dia(3)),
  evento("g1", "ENTREGADO", "EN_PROGRESO", "ana", dia(4)),
  evento("g1", "EN_PROGRESO", "ENTREGADO", "ana", dia(5)),
  evento("g1", "ENTREGADO", "COMPLETADO", "ana", dia(6)),
];
const g1 = { id: "g1", estado: "COMPLETADO" as const, editorId: "ana", fechaLimite: dia(3, 12) };

describe("métricas por editor", () => {
  it("cuenta cada guion una vez y mide hasta la primera entrega", () => {
    const [ana] = calcularMetricas(historia, [g1]);
    expect(ana).toMatchObject({
      editorId: "ana",
      asignados: 1,
      entregados: 1,
      completados: 1,
      devueltos: 1,
      aTiempo: 1,
    });
    expect(ana.tiempoMedioMs).toBe(2 * 24 * 3_600_000);
  });

  it("entregar el último día, a última hora, es a tiempo; al día siguiente, no", () => {
    const base = [evento("g", "APROBADO", "ASIGNADO", "ana", dia(1))];
    const guion = {
      id: "g",
      estado: "ENTREGADO" as const,
      editorId: "ana",
      fechaLimite: dia(3, 12),
    };
    const entrega = (fecha: Date) => [
      ...base,
      evento("g", "EN_PROGRESO", "ENTREGADO", "ana", fecha),
    ];
    expect(calcularMetricas(entrega(dia(3, 23)), [guion])[0].aTiempo).toBe(1);
    expect(calcularMetricas(entrega(dia(4, 1)), [guion])[0].aTiempo).toBe(0);
  });

  it("el rango de fechas solo cuenta lo ocurrido dentro", () => {
    const [ana] = calcularMetricas(historia, [g1], { desde: dia(4, 0), hasta: dia(5, 23) });
    expect(ana).toMatchObject({ asignados: 0, entregados: 0, devueltos: 1, completados: 0 });
    expect(ana.tiempoMedioMs).toBeNull();
  });

  it("al reasignar, cada editor conserva lo suyo", () => {
    const eventos = [
      evento("g", "APROBADO", "ASIGNADO", "ana", dia(1)),
      evento("g", "ASIGNADO", "EN_PROGRESO", "ana", dia(2)),
      evento("g", "EN_PROGRESO", "ASIGNADO", "luis", dia(3)),
      evento("g", "ASIGNADO", "EN_PROGRESO", "luis", dia(3, 12)),
    ];
    const guion = {
      id: "g",
      estado: "EN_PROGRESO" as const,
      editorId: "luis",
      fechaLimite: dia(9),
    };
    const metricas = calcularMetricas(eventos, [guion]);
    expect(metricas.find((m) => m.editorId === "ana")).toMatchObject({
      asignados: 1,
      enProgreso: 0,
    });
    expect(metricas.find((m) => m.editorId === "luis")).toMatchObject({
      asignados: 1,
      enProgreso: 1,
    });
  });

  it("escribe los tiempos de forma legible", () => {
    expect(duracionLegible(51 * 3_600_000)).toBe("2 d 3 h");
    expect(duracionLegible(5 * 3_600_000)).toBe("5 h");
    expect(duracionLegible(60_000)).toBe("menos de 1 h");
  });
});
