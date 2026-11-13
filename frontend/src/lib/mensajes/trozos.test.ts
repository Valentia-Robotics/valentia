import { describe, expect, it } from "vitest";
import { trozoPedido } from "./trozos";

describe("peticiones por trozos de las notas de voz (Safari)", () => {
  it("sin cabecera, todo el archivo", () => {
    expect(trozoPedido(null, 1000)).toBeNull();
    expect(trozoPedido("bytes=-", 1000)).toBeNull();
    expect(trozoPedido("bytes=0-10,20-30", 1000)).toBeNull();
  });

  it("el primer pedido de Safari (bytes=0-1)", () => {
    expect(trozoPedido("bytes=0-1", 1000)).toEqual({ inicio: 0, fin: 1 });
  });

  it("desde un punto hasta el final, y los últimos bytes", () => {
    expect(trozoPedido("bytes=500-", 1000)).toEqual({ inicio: 500, fin: 999 });
    expect(trozoPedido("bytes=900-5000", 1000)).toEqual({ inicio: 900, fin: 999 });
    expect(trozoPedido("bytes=-100", 1000)).toEqual({ inicio: 900, fin: 999 });
    expect(trozoPedido("bytes=-5000", 1000)).toEqual({ inicio: 0, fin: 999 });
  });

  it("lo que no existe da 416", () => {
    expect(trozoPedido("bytes=1000-", 1000)).toBe("no-vale");
    expect(trozoPedido("bytes=50-10", 1000)).toBe("no-vale");
    expect(trozoPedido("bytes=-0", 1000)).toBe("no-vale");
  });
});
