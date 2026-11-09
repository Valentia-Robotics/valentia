/**
 * Las reglas de los guiones en el SERVIDOR, sin pasar por los botones: aunque alguien llame a estas
 * funciones a mano, no puede saltarse el flujo ni tocar lo que no es suyo. Base de datos simulada.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const bd = vi.hoisted(() => ({
  guion: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  usuario: { findFirst: vi.fn() },
  cambioEstadoGuion: { create: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  db: bd,
  transaccion: (trabajo: (tx: typeof bd) => unknown) => trabajo(bd),
}));

import {
  actualizarGuion,
  asignarGuion,
  cambiarEstado,
  descartarGuion,
  ErrorGuion,
  guardarNotasEditor,
  guionDelEditor,
  guionesDelEditor,
  recuperarGuion,
} from "./guiones";

const admin = { id: "admin", nombre: "Ada" };
const ana = { id: "ana", nombre: "Ana" };

beforeEach(() => {
  vi.clearAllMocks();
  bd.guion.updateMany.mockResolvedValue({ count: 1 });
  bd.usuario.findFirst.mockResolvedValue({ nombre: "Ana" });
});

describe("asignar", () => {
  it.each(["BORRADOR", "PENDIENTE_APROBACION", "ENTREGADO", "COMPLETADO"])(
    "rechaza un guion en estado %s",
    async (estado) => {
      bd.guion.findUnique.mockResolvedValue({ estado, editorId: null, editor: null });
      await expect(asignarGuion("g", "ana", admin)).rejects.toBeInstanceOf(ErrorGuion);
      expect(bd.guion.updateMany).not.toHaveBeenCalled();
    },
  );

  it("solo a alguien con rol EDITOR", async () => {
    bd.guion.findUnique.mockResolvedValue({ estado: "APROBADO", editorId: null, editor: null });
    bd.usuario.findFirst.mockResolvedValue(null);
    await expect(asignarGuion("g", "clara", admin)).rejects.toBeInstanceOf(ErrorGuion);
    expect(bd.usuario.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "clara", rol: "EDITOR" } }),
    );
    expect(bd.guion.updateMany).not.toHaveBeenCalled();
  });

  it("un guion aprobado queda asignado y va al historial", async () => {
    bd.guion.findUnique.mockResolvedValue({ estado: "APROBADO", editorId: null, editor: null });
    await asignarGuion("g", "ana", admin);
    expect(bd.cambioEstadoGuion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        estadoNuevo: "ASIGNADO",
        editorId: "ana",
        usuarioId: "admin",
      }),
    });
  });
});

describe("cambiar de estado", () => {
  it("un editor solo encuentra sus guiones, también al escribir", async () => {
    bd.guion.findFirst.mockResolvedValue({ estado: "ASIGNADO", editorId: "ana" });
    await cambiarEstado({ guionId: "g", a: "EN_PROGRESO", actor: "EDITOR", autor: ana });
    expect(bd.guion.findFirst.mock.calls[0][0].where).toEqual({ id: "g", editorId: "ana" });
    expect(bd.guion.updateMany.mock.calls[0][0].where).toMatchObject({ editorId: "ana" });
  });

  it("el guion de otro editor no existe para él", async () => {
    bd.guion.findFirst.mockResolvedValue(null);
    await expect(
      cambiarEstado({ guionId: "g", a: "ENTREGADO", actor: "EDITOR", autor: ana }),
    ).rejects.toBeInstanceOf(ErrorGuion);
    expect(bd.guion.updateMany).not.toHaveBeenCalled();
  });

  it("un editor no puede aprobarse ni completarse nada", async () => {
    bd.guion.findFirst.mockResolvedValue({ estado: "ENTREGADO", editorId: "ana" });
    await expect(
      cambiarEstado({ guionId: "g", a: "COMPLETADO", actor: "EDITOR", autor: ana }),
    ).rejects.toBeInstanceOf(ErrorGuion);
    expect(bd.cambioEstadoGuion.create).not.toHaveBeenCalled();
  });

  it("devolver sin comentario no hace nada", async () => {
    bd.guion.findFirst.mockResolvedValue({ estado: "ENTREGADO", editorId: "ana" });
    await expect(
      cambiarEstado({
        guionId: "g",
        a: "EN_PROGRESO",
        actor: "ADMIN",
        autor: admin,
        comentario: "",
      }),
    ).rejects.toThrow("Explica");
    expect(bd.guion.updateMany).not.toHaveBeenCalled();
  });

  it("cada cambio guarda quién, de qué estado a cuál y el editor", async () => {
    bd.guion.findFirst.mockResolvedValue({ estado: "ENTREGADO", editorId: "ana" });
    await cambiarEstado({ guionId: "g", a: "COMPLETADO", actor: "ADMIN", autor: admin });
    expect(bd.cambioEstadoGuion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        estadoAnterior: "ENTREGADO",
        estadoNuevo: "COMPLETADO",
        usuarioNombre: "Ada",
        editorId: "ana",
      }),
    });
  });

  it("si otra persona se adelanta, no se duplica el historial", async () => {
    bd.guion.findFirst.mockResolvedValue({ estado: "ENTREGADO", editorId: "ana" });
    bd.guion.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      cambiarEstado({ guionId: "g", a: "COMPLETADO", actor: "ADMIN", autor: admin }),
    ).rejects.toBeInstanceOf(ErrorGuion);
    expect(bd.cambioEstadoGuion.create).not.toHaveBeenCalled();
  });
});

describe("lo que puede tocar cada uno", () => {
  it("el texto solo se edita antes de aprobar", async () => {
    await actualizarGuion("g", {} as never);
    expect(bd.guion.updateMany.mock.calls[0][0].where.estado.in).toEqual([
      "BORRADOR",
      "PENDIENTE_APROBACION",
    ]);
  });

  it("la zona de trabajo es del editor del guion, y solo escribe sus notas", async () => {
    await guardarNotasEditor("g", "ana", "mis notas");
    const { where, data } = bd.guion.updateMany.mock.calls[0][0];
    expect(where).toMatchObject({ id: "g", editorId: "ana" });
    expect(data).toEqual({ notasEditor: "mis notas" });
  });

  it("las lecturas del editor siempre van filtradas por su id", async () => {
    await guionesDelEditor("ana");
    await guionDelEditor("g", "ana");
    expect(bd.guion.findMany.mock.calls[0][0].where.editorId).toBe("ana");
    expect(bd.guion.findFirst.mock.calls[0][0].where).toMatchObject({ id: "g", editorId: "ana" });
  });
});

describe("descartar y recuperar (nunca se borra)", () => {
  it("descartar pasa a DESCARTADO, lo apunta y no borra nada", async () => {
    bd.guion.findFirst.mockResolvedValue({ id: "g", estado: "PENDIENTE_APROBACION" });
    await expect(descartarGuion("g", admin)).resolves.toBe(true);
    expect(bd.guion.deleteMany).not.toHaveBeenCalled();
    expect(bd.guion.updateMany).toHaveBeenCalledWith({
      where: { id: "g", editorId: null, estado: "PENDIENTE_APROBACION" },
      data: { estado: "DESCARTADO" },
    });
    expect(bd.cambioEstadoGuion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        estadoAnterior: "PENDIENTE_APROBACION",
        estadoNuevo: "DESCARTADO",
      }),
    });
  });

  it("solo automáticos sin editor", async () => {
    bd.guion.findFirst.mockResolvedValue(null);
    await expect(descartarGuion("g", admin)).resolves.toBe(false);
    expect(bd.guion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ origen: "IA", editorId: null }) }),
    );
    expect(bd.guion.updateMany).not.toHaveBeenCalled();
  });

  it("recuperar lo devuelve a pendiente de aprobación", async () => {
    await expect(recuperarGuion("g", admin)).resolves.toBe(true);
    expect(bd.guion.updateMany).toHaveBeenCalledWith({
      where: { id: "g", estado: "DESCARTADO" },
      data: { estado: "PENDIENTE_APROBACION" },
    });
    expect(bd.cambioEstadoGuion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        estadoAnterior: "DESCARTADO",
        estadoNuevo: "PENDIENTE_APROBACION",
      }),
    });
  });

  it("recuperar uno que no está descartado no hace nada", async () => {
    bd.guion.updateMany.mockResolvedValue({ count: 0 });
    await expect(recuperarGuion("g", admin)).resolves.toBe(false);
    expect(bd.cambioEstadoGuion.create).not.toHaveBeenCalled();
  });
});
