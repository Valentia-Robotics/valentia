import { describe, expect, it } from "vitest";
import {
  ESTADOS_ASIGNABLES,
  ESTADOS_DEL_EDITOR,
  ESTADOS_EDITABLES,
  exigeComentario,
  ORDEN_ESTADOS,
  puedeCambiar,
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
