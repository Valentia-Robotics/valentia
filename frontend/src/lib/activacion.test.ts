/**
 * Reglas de activación de códigos (BD simulada): sobre todo, las de las tarjetas de bienvenida (kit gratis).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const bd = vi.hoisted(() => ({
  codigoActivacion: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  cursoUsuario: { findUnique: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/db", () => ({
  db: bd,
  transaccion: (fn: (tx: typeof bd) => unknown) => fn(bd),
}));

import { activarCodigo } from "./activacion";

const codigo = (precioCentimos: number, extra = {}) => ({
  usadoEn: null,
  usuarioId: null,
  desactivadoEn: null,
  kitId: "kit1",
  kit: { cursoId: "curso1", precioCentimos, curso: { slug: "bienvenida-a-valentia" } },
  ...extra,
});

beforeEach(() => {
  vi.resetAllMocks();
  bd.codigoActivacion.updateMany.mockResolvedValue({ count: 1 });
});

describe("activarCodigo", () => {
  it("un código libre da el curso de SU kit y se marca como usado", async () => {
    bd.codigoActivacion.findUnique.mockResolvedValue(codigo(0));
    bd.cursoUsuario.findUnique.mockResolvedValue(null);
    expect(await activarCodigo("u1", "VAL-AAAA-BBBB")).toEqual({
      estado: "activado",
      cursoSlug: "bienvenida-a-valentia",
    });
    expect(bd.cursoUsuario.create).toHaveBeenCalledWith({
      data: { usuarioId: "u1", cursoId: "curso1" },
    });
  });

  it("bienvenida: si ya tenía el vídeo (lo consiguió gratis), el código cuenta igual", async () => {
    bd.codigoActivacion.findUnique.mockResolvedValue(codigo(0));
    bd.cursoUsuario.findUnique.mockResolvedValue({ id: "x" });
    bd.codigoActivacion.findFirst.mockResolvedValue(null);
    const r = await activarCodigo("u1", "VAL-AAAA-BBBB");
    expect(r.estado).toBe("ya-tienes");
    expect(bd.codigoActivacion.updateMany).toHaveBeenCalledOnce();
  });

  it("bienvenida: quien ya usó otra tarjeta no cuenta dos veces", async () => {
    bd.codigoActivacion.findUnique.mockResolvedValue(codigo(0));
    bd.cursoUsuario.findUnique.mockResolvedValue({ id: "x" });
    bd.codigoActivacion.findFirst.mockResolvedValue({ id: "otro" });
    await activarCodigo("u1", "VAL-AAAA-BBBB");
    expect(bd.codigoActivacion.updateMany).not.toHaveBeenCalled();
  });

  it("kit de pago: si ya tiene el curso, el código NO se gasta (puede regalarlo)", async () => {
    bd.codigoActivacion.findUnique.mockResolvedValue(codigo(5990));
    bd.cursoUsuario.findUnique.mockResolvedValue({ id: "x" });
    await activarCodigo("u1", "VAL-AAAA-BBBB");
    expect(bd.codigoActivacion.updateMany).not.toHaveBeenCalled();
  });

  it("un código usado por otra persona no sirve", async () => {
    bd.codigoActivacion.findUnique.mockResolvedValue(
      codigo(0, { usadoEn: new Date(), usuarioId: "u2" }),
    );
    expect(await activarCodigo("u1", "VAL-AAAA-BBBB")).toEqual({ estado: "usado" });
  });
});
