import { describe, expect, it } from "vitest";
import { devuelveStockAlBorrar, motivoNoBorrarPedido } from "./borrarPedido";

describe("motivoNoBorrarPedido", () => {
  it("deja borrar un pedido de prueba", () => {
    expect(motivoNoBorrarPedido({ cobroReal: false })).toBeNull();
  });
  it("no deja borrar un pedido cobrado de verdad", () => {
    expect(motivoNoBorrarPedido({ cobroReal: true })).toMatch(/Finanzas/);
  });
});

describe("devuelveStockAlBorrar", () => {
  it.each(["PENDIENTE", "PAGADO", "PREPARANDO"] as const)("%s devuelve las piezas", (estado) => {
    expect(devuelveStockAlBorrar(estado)).toBe(true);
  });
  it.each(["ENVIADO", "ENTREGADO", "CANCELADO"] as const)("%s no las devuelve", (estado) => {
    expect(devuelveStockAlBorrar(estado)).toBe(false);
  });
});
