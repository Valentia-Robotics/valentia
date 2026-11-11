import { describe, expect, it } from "vitest";
import {
  ESTADOS_ASIGNABLES,
  ESTADOS_DEL_EDITOR,
  ESTADOS_EDITABLES,
  exigeComentario,
  limpiarPasos,
  ORDEN_ESTADOS,
  puedeCambiar,
  textoDuracion,
  tiempoLectura,
  urgenciaGuion,
} from "./estadosGuion";

describe("flujo de los guiones", () => {
  it("el admin aprueba y completa; el editor empieza y entrega", () => {
    expect(puedeCambiar("BORRADOR", "PENDIENTE_APROBACION", "ADMIN")).toBe(true);
    expect(puedeCambiar("PENDIENTE_APROBACION", "APROBADO", "ADMIN")).toBe(true);
    expect(puedeCambiar("ASIGNADO", "EN_PROGRESO", "EDITOR")).toBe(true);
    expect(puedeCambiar("EN_PROGRESO", "ENTREGADO", "EDITOR")).toBe(true);
    expect(puedeCambiar("ENTREGADO", "COMPLETADO", "ADMIN")).toBe(true);
  });

  it("un editor nunca aprueba, completa ni devuelve", () => {
    for (const de of ORDEN_ESTADOS) {
      for (const a of ["APROBADO", "COMPLETADO", "BORRADOR"] as const) {
        expect(puedeCambiar(de, a, "EDITOR")).toBe(false);
      }
    }
    expect(puedeCambiar("ENTREGADO", "EN_PROGRESO", "EDITOR")).toBe(false);
  });

  it("el admin no hace el trabajo del editor ni se salta pasos", () => {
    expect(puedeCambiar("ASIGNADO", "EN_PROGRESO", "ADMIN")).toBe(false);
    expect(puedeCambiar("EN_PROGRESO", "ENTREGADO", "ADMIN")).toBe(false);
    expect(puedeCambiar("BORRADOR", "APROBADO", "ADMIN")).toBe(false);
    expect(puedeCambiar("COMPLETADO", "EN_PROGRESO", "ADMIN")).toBe(false);
  });

  it("solo se asigna lo aprobado, y solo se corrige antes de asignar", () => {
    expect(ESTADOS_ASIGNABLES).toContain("APROBADO");
    expect(ESTADOS_ASIGNABLES).not.toContain("BORRADOR");
    expect(ESTADOS_ASIGNABLES).not.toContain("PENDIENTE_APROBACION");
    expect(puedeCambiar("APROBADO", "BORRADOR", "ADMIN")).toBe(true);
    expect(puedeCambiar("ASIGNADO", "BORRADOR", "ADMIN")).toBe(false);
    expect(ESTADOS_EDITABLES).toEqual(["BORRADOR", "PENDIENTE_APROBACION"]);
  });

  it("el editor no ve guiones sin aprobar", () => {
    expect(ESTADOS_DEL_EDITOR).not.toContain("BORRADOR");
    expect(ESTADOS_DEL_EDITOR).not.toContain("PENDIENTE_APROBACION");
    expect(ESTADOS_DEL_EDITOR).not.toContain("APROBADO");
  });

  it("devolver una entrega exige comentario", () => {
    expect(exigeComentario("ENTREGADO", "EN_PROGRESO")).toBe(true);
    expect(exigeComentario("ENTREGADO", "COMPLETADO")).toBe(false);
  });
});

describe("ideas propias del editor y su espacio de trabajo", () => {
  it("el autor envía, retira, archiva y recupera; nunca aprueba", () => {
    expect(puedeCambiar("BORRADOR", "PENDIENTE_APROBACION", "AUTOR")).toBe(true);
    expect(puedeCambiar("PENDIENTE_APROBACION", "BORRADOR", "AUTOR")).toBe(true);
    expect(puedeCambiar("BORRADOR", "DESCARTADO", "AUTOR")).toBe(true);
    expect(puedeCambiar("DESCARTADO", "BORRADOR", "AUTOR")).toBe(true);
    expect(puedeCambiar("PENDIENTE_APROBACION", "APROBADO", "AUTOR")).toBe(false);
    expect(puedeCambiar("APROBADO", "ASIGNADO", "AUTOR")).toBe(false);
    expect(puedeCambiar("ASIGNADO", "EN_PROGRESO", "AUTOR")).toBe(false);
  });

  it("los pasos se limpian y se ordenan", () => {
    expect(limpiarPasos(["revision", "inventado", "leido", "leido"])).toEqual([
      "leido",
      "revision",
    ]);
  });

  it("dice cuánto queda para la fecha límite", () => {
    const ahora = new Date("2026-11-10T09:00:00Z");
    const dia = (d: string) => new Date(`${d}T12:00:00Z`);
    expect(urgenciaGuion(dia("2026-11-08"), "EN_PROGRESO", ahora)?.texto).toBe("Retrasado 2 días");
    expect(urgenciaGuion(dia("2026-11-10"), "ASIGNADO", ahora)?.texto).toBe("Vence hoy");
    expect(urgenciaGuion(dia("2026-11-11"), "ASIGNADO", ahora)?.texto).toBe("Vence mañana");
    expect(urgenciaGuion(dia("2026-11-15"), "ASIGNADO", ahora)?.tono).toBe("aviso");
    expect(urgenciaGuion(dia("2026-12-15"), "ASIGNADO", ahora)?.tono).toBe("neutro");
    expect(urgenciaGuion(dia("2026-11-01"), "ENTREGADO", ahora)).toBeNull();
  });

  it("calcula el tiempo de lectura", () => {
    const texto = Array.from({ length: 150 }, () => "robot").join(" ");
    expect(tiempoLectura([texto, "  "])).toEqual({ palabras: 150, segundos: 60 });
    expect(textoDuracion(40)).toBe("40 s");
    expect(textoDuracion(95)).toBe("1 min 35 s");
    expect(textoDuracion(120)).toBe("2 min");
  });
});
