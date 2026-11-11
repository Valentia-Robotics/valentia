import { describe, expect, it } from "vitest";
import {
  accionesDe,
  formatearValorAccion,
  repartoSocios,
  SOCIOS,
  sinIva,
  TOTAL_ACCIONES,
  valorAccion,
  valorCalculado,
} from "./acciones";

describe("acciones de la empresa", () => {
  it("los socios suman el 100 % y todas las acciones", () => {
    expect(SOCIOS.reduce((t, s) => t + s.porcentaje, 0)).toBe(100);
    expect(SOCIOS.reduce((t, s) => t + accionesDe(s.porcentaje), 0)).toBe(TOTAL_ACCIONES);
  });

  it("reparte 3.000 acciones: 1.500, 1.470 y 30", () => {
    expect(SOCIOS.map((s) => accionesDe(s.porcentaje))).toEqual([1500, 1470, 30]);
  });

  it("valor de una acción y de lo de cada socio", () => {
    // Empresa de 30.000 € → 10 € por acción
    expect(valorAccion(3_000_000)).toBe(1000);
    expect(repartoSocios(3_000_000).map((f) => f.valorCentimos)).toEqual([
      1_500_000, 1_470_000, 30_000,
    ]);
  });

  it("con decimales, cada socio sale redondeado al céntimo", () => {
    // 10.000 € / 3.000 = 3,3333… € por acción
    expect(formatearValorAccion(valorAccion(1_000_000))).toMatch(/^3,3333\s€$/);
    expect(repartoSocios(1_000_000).map((f) => f.valorCentimos)).toEqual([
      500_000, 490_000, 10_000,
    ]);
  });

  it("valor calculado: beneficio sin IVA + stock a precio sin IVA", () => {
    expect(sinIva(12100)).toBe(10000);
    const v = valorCalculado(50_000, [
      { precioCentimos: 12100, stock: 2 },
      { precioCentimos: 1210, stock: 10 },
      { precioCentimos: 1000, stock: -3 }, // un stock negativo no resta
    ]);
    expect(v).toEqual({ beneficioAcumulado: 50_000, valorStock: 30_000, total: 80_000 });
  });

  it("con pérdidas el valor puede ser negativo", () => {
    expect(valorCalculado(-90_000, []).total).toBe(-90_000);
    expect(repartoSocios(-300_000)[0].valorCentimos).toBe(-150_000);
  });
});
