import { describe, expect, it } from "vitest";
import { estadoStock, faltanParaMinimo, leerEntero, minimoDe, textoTienda } from "./stock";

describe("stock", () => {
  it("usa el aviso de siempre si el producto no tiene el suyo", () => {
    expect(minimoDe("kit", null)).toBe(3);
    expect(minimoDe("componente", undefined)).toBe(10);
    expect(minimoDe("kit", 0)).toBe(0);
    expect(minimoDe("componente", 25)).toBe(25);
  });

  it("decide el estado según las unidades", () => {
    expect(estadoStock(0, 3)).toBe("agotado");
    expect(estadoStock(-1, 3)).toBe("agotado");
    expect(estadoStock(1, 3)).toBe("bajo");
    expect(estadoStock(3, 3)).toBe("bajo");
    expect(estadoStock(4, 3)).toBe("ok");
    expect(estadoStock(1, 0)).toBe("ok");
    expect(estadoStock(0, 0)).toBe("agotado");
    expect(estadoStock(0, 3, true)).toBe("pedido");
    expect(estadoStock(2, 3, true)).toBe("pedido");
    expect(estadoStock(9, 3, true)).toBe("ok");
  });

  it("calcula cuánto falta para salir del aviso", () => {
    expect(faltanParaMinimo(0, 10)).toBe(11);
    expect(faltanParaMinimo(7, 10)).toBe(4);
    expect(faltanParaMinimo(20, 10)).toBe(0);
  });

  it("dice al cliente si no hay o si vuelve pronto", () => {
    expect(textoTienda(5, false)).toBe("En stock");
    expect(textoTienda(5, true)).toBe("En stock");
    expect(textoTienda(0, true)).toBe("En reposición");
    expect(textoTienda(0, false)).toBe("Sin stock");
  });

  it("solo acepta enteros dentro del límite", () => {
    expect(leerEntero("12", 100)).toBe(12);
    expect(leerEntero(" 0 ", 100)).toBe(0);
    expect(leerEntero("-3", 100)).toBeNull();
    expect(leerEntero("2.5", 100)).toBeNull();
    expect(leerEntero("", 100)).toBeNull();
    expect(leerEntero("101", 100)).toBeNull();
    expect(leerEntero(null, 100)).toBeNull();
  });
});
