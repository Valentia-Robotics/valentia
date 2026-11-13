/**
 * Borrar pedidos desde el panel, con la base de datos simulada: solo los de prueba,
 * devuelve el stock si aún lo tenía apartado y respeta los códigos que alguien ya activó.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const bd = vi.hoisted(() => ({
  pedido: { findUnique: vi.fn(), deleteMany: vi.fn() },
  componente: { updateMany: vi.fn() },
  kit: { updateMany: vi.fn() },
  codigoActivacion: { deleteMany: vi.fn(), updateMany: vi.fn() },
  lineaPedido: { deleteMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  db: bd,
  transaccion: (trabajo: (tx: typeof bd) => unknown) => trabajo(bd),
}));

import { borrarPedidos } from "./borrarPedidos";

const base = {
  numero: "VAL-2026-JOSE01",
  estado: "PAGADO",
  cobroReal: false,
  proveedorPago: "simulado",
  referenciaPago: null,
  lineas: [{ tipo: "KIT", slug: "vr1-starter-kit", cantidad: 2, piezas: null }],
};
const nuncaPagado = vi.fn(async () => true);

beforeEach(() => {
  vi.clearAllMocks();
  bd.pedido.deleteMany.mockResolvedValue({ count: 1 });
});

describe("borrarPedidos", () => {
  it("borra un pedido de prueba, devuelve su stock y borra sus códigos sin usar", async () => {
    bd.pedido.findUnique.mockResolvedValue(base);
    const r = await borrarPedidos(["p1"], nuncaPagado);
    expect(r).toEqual({ borrados: ["VAL-2026-JOSE01"], saltados: [] });
    expect(bd.kit.updateMany).toHaveBeenCalledWith({
      where: { slug: "vr1-starter-kit" },
      data: { stock: { increment: 2 } },
    });
    expect(bd.codigoActivacion.deleteMany).toHaveBeenCalledWith({
      where: { pedidoId: "p1", usadoEn: null, loteId: null },
    });
    // Los usados se quedan, sin pedido (quien lo activó conserva su curso)
    expect(bd.codigoActivacion.updateMany).toHaveBeenCalledWith({
      where: { pedidoId: "p1" },
      data: { pedidoId: null },
    });
    expect(bd.lineaPedido.deleteMany).toHaveBeenCalledWith({ where: { pedidoId: "p1" } });
    expect(bd.pedido.deleteMany).toHaveBeenCalledWith({ where: { id: "p1", cobroReal: false } });
  });

  it("no toca nada de un pedido cobrado de verdad", async () => {
    bd.pedido.findUnique.mockResolvedValue({ ...base, cobroReal: true, proveedorPago: "stripe" });
    const r = await borrarPedidos(["p1"], nuncaPagado);
    expect(r.borrados).toEqual([]);
    expect(r.saltados[0]?.motivo).toMatch(/Finanzas/);
    expect(bd.pedido.deleteMany).not.toHaveBeenCalled();
    expect(bd.kit.updateMany).not.toHaveBeenCalled();
  });

  it.each(["ENVIADO", "ENTREGADO", "CANCELADO"])(
    "un pedido %s se borra sin devolver stock",
    async (estado) => {
      bd.pedido.findUnique.mockResolvedValue({ ...base, estado });
      const r = await borrarPedidos(["p1"], nuncaPagado);
      expect(r.borrados).toHaveLength(1);
      expect(bd.kit.updateMany).not.toHaveBeenCalled();
    },
  );

  it("un pago de Stripe a medias se cancela antes de borrar", async () => {
    const pendiente = {
      ...base,
      estado: "PENDIENTE",
      proveedorPago: "stripe",
      referenciaPago: "pi_1",
    };
    bd.pedido.findUnique.mockResolvedValue(pendiente);
    const cancelar = vi.fn(async () => true);
    const r = await borrarPedidos(["p1"], cancelar);
    expect(cancelar).toHaveBeenCalledWith("pi_1");
    expect(r.borrados).toHaveLength(1);
  });

  it("si Stripe dice que ya se ha pagado, no se borra", async () => {
    bd.pedido.findUnique.mockResolvedValue({
      ...base,
      estado: "PENDIENTE",
      proveedorPago: "stripe",
      referenciaPago: "pi_1",
    });
    const r = await borrarPedidos(
      ["p1"],
      vi.fn(async () => false),
    );
    expect(r.borrados).toEqual([]);
    expect(r.saltados[0]?.motivo).toMatch(/Stripe/);
    expect(bd.pedido.deleteMany).not.toHaveBeenCalled();
  });

  it("se salta en silencio un pedido que ya no existe", async () => {
    bd.pedido.findUnique.mockResolvedValue(null);
    expect(await borrarPedidos(["p1"], nuncaPagado)).toEqual({ borrados: [], saltados: [] });
  });
});
