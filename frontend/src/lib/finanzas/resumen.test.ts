import { describe, expect, it } from "vitest";
import {
  ivaIncluido,
  leerPeriodo,
  mesEnEspana,
  mesesDelPeriodo,
  sumarMeses,
} from "@/config/finanzas";
import { resumirFinanzas, type Apunte } from "./resumen";

const apunte = (
  tipo: Apunte["tipo"],
  categoria: string,
  euros: number,
  dia: string,
  iva = 0,
): Apunte => ({
  tipo,
  categoria,
  importeCentimos: euros * 100,
  ivaCentimos: iva * 100,
  fecha: new Date(`${dia}T12:00:00Z`),
});

describe("reglas de finanzas", () => {
  it("calcula el IVA que va dentro del importe", () => {
    expect(ivaIncluido(12100, 21)).toBe(2100);
    expect(ivaIncluido(11000, 10)).toBe(1000);
    expect(ivaIncluido(5000, 0)).toBe(0);
  });

  it("cuenta los meses en hora de España", () => {
    // 31 de octubre a las 23:30 UTC ya es 1 de noviembre en España
    expect(mesEnEspana(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11");
    expect(sumarMeses("2026-01", -1)).toBe("2025-12");
    expect(sumarMeses("2026-12", 1)).toBe("2027-01");
  });

  it("lee el periodo de la dirección", () => {
    expect(leerPeriodo("2026")).toEqual({ tipo: "anio", anio: 2026 });
    expect(leerPeriodo("todo")).toEqual({ tipo: "todo" });
    expect(leerPeriodo("cualquier cosa")).toEqual({ tipo: "12m" });
    const meses = mesesDelPeriodo({ tipo: "12m" }, "2026-11");
    expect(meses).toHaveLength(12);
    expect(meses[0]).toBe("2025-12");
    expect(mesesDelPeriodo({ tipo: "todo" }, "2026-11", "2024-03")[0]).toBe("2024-03");
  });
});

describe("resumirFinanzas", () => {
  const meses = ["2026-09", "2026-10", "2026-11", "2026-12"];
  const apuntes = [
    apunte("GASTO", "componentes", 300, "2026-09-05", 52.07),
    apunte("INGRESO", "ventas-web", 500, "2026-10-02", 86.78),
    apunte("GASTO", "marketing", 100, "2026-10-20"),
    apunte("INGRESO", "talleres", 200, "2026-11-01"),
    // Fuera del periodo: no cuenta
    apunte("INGRESO", "ventas-web", 9999, "2025-01-01"),
  ];
  const r = resumirFinanzas(apuntes, meses, "2026-11");

  it("suma ingresos, gastos y beneficio", () => {
    expect(r.ingresos).toBe(70000);
    expect(r.gastos).toBe(40000);
    expect(r.beneficio).toBe(30000);
    expect(r.margen).toBeCloseTo(42.857, 2);
    expect(r.numIngresos).toBe(2);
    expect(r.numGastos).toBe(2);
  });

  it("separa el IVA", () => {
    expect(r.ivaCobrado).toBe(8678);
    expect(r.ivaPagado).toBe(5207);
    expect(r.beneficioSinIva).toBe(70000 - 8678 - (40000 - 5207));
  });

  it("saca la evolución de cada mes con el acumulado", () => {
    expect(r.meses.map((m) => m.beneficio)).toEqual([-30000, 40000, 20000, 0]);
    expect(r.meses.map((m) => m.acumulado)).toEqual([-30000, 10000, 30000, 30000]);
    expect(r.mejorMes?.mes).toBe("2026-10");
    expect(r.peorMes?.mes).toBe("2026-09");
    // Media de septiembre a noviembre (diciembre aún no ha llegado)
    expect(r.gastoMedioMensual).toBe(Math.round(40000 / 3));
  });

  it("reparte por categorías, de más a menos", () => {
    expect(r.gastosPorCategoria.map((c) => c.slug)).toEqual(["componentes", "marketing"]);
    expect(r.ingresosPorCategoria[0]).toMatchObject({
      nombre: "Ventas en la web",
      cantidad: 50000,
    });
  });

  it("sin apuntes, todo a cero y sin margen", () => {
    const vacio = resumirFinanzas([], meses, "2026-11");
    expect(vacio.beneficio).toBe(0);
    expect(vacio.margen).toBeNull();
    expect(vacio.mejorMes).toBeNull();
    expect(vacio.gastoMedioMensual).toBe(0);
  });
});
