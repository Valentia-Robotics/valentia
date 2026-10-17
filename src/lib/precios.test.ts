/**
 * Pruebas del cálculo de precios, envíos, IVA y zona de envío (src/lib/precios.ts).
 * Los valores esperados salen de src/config/tienda.ts: si cambias el envío, estas pruebas lo siguen.
 */
import { describe, expect, it } from "vitest";
import { tienda } from "@/config/tienda";
import {
  calcularEnvio,
  calcularTotales,
  codigoPostalEnZona,
  ivaIncluido,
  provinciaDeCodigoPostal,
} from "./precios";

const { costeCentimos, gratisDesdeCentimos } = tienda.envio;

describe("gastos de envío", () => {
  it("cobra el envío por debajo del mínimo", () => {
    expect(calcularEnvio(gratisDesdeCentimos - 1)).toBe(costeCentimos);
    expect(calcularEnvio(990)).toBe(costeCentimos);
  });

  it("es gratis justo en el mínimo y por encima", () => {
    expect(calcularEnvio(gratisDesdeCentimos)).toBe(0);
    expect(calcularEnvio(gratisDesdeCentimos + 12_345)).toBe(0);
  });

  it("no cobra envío si no hay productos", () => {
    expect(calcularEnvio(0)).toBe(0);
  });
});

describe("IVA incluido", () => {
  it("separa base e IVA del 21 %", () => {
    expect(ivaIncluido(12_100)).toEqual({ baseCentimos: 10_000, ivaCentimos: 2_100 });
  });

  it("la base más el IVA siempre suman el total (sin perder céntimos al redondear)", () => {
    for (const total of [1, 99, 495, 6_990, 7_990, 12_345, 99_999]) {
      const { baseCentimos, ivaCentimos } = ivaIncluido(total);
      expect(baseCentimos + ivaCentimos).toBe(total);
    }
  });

  it("redondea al céntimo más cercano", () => {
    // 69,90 € / 1,21 = 57,768… → 57,77 € de base y 12,13 € de IVA
    expect(ivaIncluido(6_990)).toEqual({ baseCentimos: 5_777, ivaCentimos: 1_213 });
  });
});

describe("totales del pedido", () => {
  it("suma el envío y desglosa el IVA del total (productos + envío)", () => {
    const t = calcularTotales(2_000);
    expect(t.envioCentimos).toBe(costeCentimos);
    expect(t.totalCentimos).toBe(2_000 + costeCentimos);
    expect(t.baseImponibleCentimos + t.ivaCentimos).toBe(t.totalCentimos);
    expect(t.faltaEnvioGratisCentimos).toBe(gratisDesdeCentimos - 2_000);
  });

  it("con envío gratis, el total es el subtotal", () => {
    const t = calcularTotales(6_990);
    expect(t).toMatchObject({
      envioCentimos: 0,
      totalCentimos: 6_990,
      faltaEnvioGratisCentimos: 0,
    });
  });

  it("rechaza importes que no son céntimos enteros", () => {
    expect(() => calcularTotales(10.5)).toThrow();
    expect(() => calcularTotales(-1)).toThrow();
  });
});

describe("zona de envío", () => {
  it.each([
    ["03001", "Alicante"],
    ["46001", "Valencia"],
    ["12001", "Castellón"],
    ["46980", "Valencia"],
  ])("el código postal %s es de %s", (cp, provincia) => {
    expect(provinciaDeCodigoPostal(cp)).toBe(provincia);
    expect(codigoPostalEnZona(cp)).toBe(true);
  });

  it.each(["28001", "08001", "30001", "4600", "460011", "ABCDE", ""])("no envía a %s", (cp) => {
    expect(codigoPostalEnZona(cp)).toBe(false);
  });

  it("acepta espacios alrededor", () => {
    expect(provinciaDeCodigoPostal(" 46001 ")).toBe("Valencia");
  });
});
