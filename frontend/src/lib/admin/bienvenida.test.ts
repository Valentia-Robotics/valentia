/** Borrado de cuentas registradas con tarjeta de bienvenida (BD simulada) */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const bd = vi.hoisted(() => ({
  kit: { findUnique: vi.fn() },
  usuario: { findUnique: vi.fn(), delete: vi.fn() },
  codigoActivacion: { count: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("@/lib/db", () => ({
  db: bd,
  transaccion: (fn: (tx: typeof bd) => unknown) => fn(bd),
}));

import { borrarUsuarioBienvenida, motivoNoBorrar } from "./bienvenida";

const cliente = { email: "ana@ejemplo.es", rol: "CLIENTE", _count: { pedidos: 0 } };
/** Primera cuenta: códigos de bienvenida; segunda: códigos de otros kits */
const codigos = (bienvenida: number, otros: number) =>
  bd.codigoActivacion.count.mockResolvedValueOnce(bienvenida).mockResolvedValueOnce(otros);

beforeEach(() => {
  vi.resetAllMocks();
  bd.kit.findUnique.mockResolvedValue({ id: "kitBienvenida" });
});

describe("motivoNoBorrar", () => {
  it("solo deja borrar clientes sin pedidos ni otros kits", () => {
    expect(motivoNoBorrar({ rol: "CLIENTE", pedidos: 0, otrosCodigos: 0 })).toBeNull();
    expect(motivoNoBorrar({ rol: "ADMIN", pedidos: 0, otrosCodigos: 0 })).not.toBeNull();
    expect(motivoNoBorrar({ rol: "EDITOR", pedidos: 0, otrosCodigos: 0 })).not.toBeNull();
    expect(motivoNoBorrar({ rol: "CLIENTE", pedidos: 1, otrosCodigos: 0 })).not.toBeNull();
    expect(motivoNoBorrar({ rol: "CLIENTE", pedidos: 0, otrosCodigos: 1 })).not.toBeNull();
  });
});

describe("borrarUsuarioBienvenida", () => {
  it("borra la cuenta y deja libre su tarjeta", async () => {
    bd.usuario.findUnique.mockResolvedValue(cliente);
    codigos(1, 0);
    expect(await borrarUsuarioBienvenida("u1")).toEqual({ ok: true, email: "ana@ejemplo.es" });
    expect(bd.codigoActivacion.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: "u1", kitId: "kitBienvenida" },
      data: { usadoEn: null, usuarioId: null },
    });
    expect(bd.usuario.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("no borra a quien no se registró con una tarjeta", async () => {
    bd.usuario.findUnique.mockResolvedValue(cliente);
    codigos(0, 0);
    expect((await borrarUsuarioBienvenida("u1")).ok).toBe(false);
    expect(bd.usuario.delete).not.toHaveBeenCalled();
  });

  it("no borra a quien también activó un kit de pago", async () => {
    bd.usuario.findUnique.mockResolvedValue(cliente);
    codigos(1, 1);
    expect((await borrarUsuarioBienvenida("u1")).ok).toBe(false);
    expect(bd.usuario.delete).not.toHaveBeenCalled();
  });

  it("nunca borra un administrador", async () => {
    bd.usuario.findUnique.mockResolvedValue({ ...cliente, rol: "ADMIN" });
    codigos(1, 0);
    expect((await borrarUsuarioBienvenida("u1")).ok).toBe(false);
    expect(bd.usuario.delete).not.toHaveBeenCalled();
  });
});
