/**
 * Borrar cuentas sin verificar desde el panel: borra SOLO la cuenta pendiente pedida, nunca una
 * cuenta verificada ni la de un administrador. La base de datos se simula en memoria
 * (entiende solo los filtros que usa src/lib/verificacion/pendientes.ts).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

interface Usuario {
  id: string;
  rol: "CLIENTE" | "ADMIN";
  creadoEn: Date;
  emailVerificadoEn: Date | null;
}
interface Fila {
  id: string;
  usuarioId: string | null;
}

const bd = vi.hoisted(() => ({
  usuarios: [] as Usuario[],
  verificaciones: [] as Fila[],
  dispositivos: [] as Fila[],
}));

/** ¿Cumple el documento el filtro de Prisma? (solo los operadores que hacen falta aquí) */
function cumple(doc: Record<string, unknown>, filtro: Record<string, unknown>): boolean {
  return Object.entries(filtro).every(([campo, condicion]) => {
    if (campo === "AND") {
      return (condicion as Record<string, unknown>[]).every((f) => cumple(doc, f));
    }
    const valor = doc[campo];
    if (condicion === null || typeof condicion !== "object" || condicion instanceof Date) {
      return valor === condicion;
    }
    const c = condicion as { not?: null; lt?: Date; in?: unknown[] };
    if ("not" in c) return valor !== c.not;
    if (c.lt) return valor instanceof Date && valor < c.lt;
    if (c.in) return c.in.includes(valor);
    throw new Error(`Filtro no simulado: ${campo}`);
  });
}

function coleccion<T extends Record<string, unknown>>(nombre: keyof typeof bd) {
  const filas = () => bd[nombre] as unknown as T[];
  return {
    findMany: async ({ where }: { where: Record<string, unknown> }) =>
      filas().filter((d) => cumple(d, where)),
    deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
      const antes = filas().length;
      bd[nombre] = filas().filter((d) => !cumple(d, where)) as never;
      return { count: antes - filas().length };
    },
  };
}

vi.mock("@/lib/db", () => ({
  db: {
    usuario: coleccion("usuarios"),
    verificacion: coleccion("verificaciones"),
    dispositivoConfianza: coleccion("dispositivos"),
  },
}));

const { borrarPendientes } = await import("./pendientes");

const AHORA = new Date("2026-10-22T12:00:00Z");
const haceDias = (dias: number) => new Date(AHORA.getTime() - dias * 24 * 60 * 60_000);

beforeEach(() => {
  bd.usuarios = [
    { id: "pendiente-viejo", rol: "CLIENTE", creadoEn: haceDias(30), emailVerificadoEn: null },
    { id: "pendiente-nuevo", rol: "CLIENTE", creadoEn: haceDias(2), emailVerificadoEn: null },
    { id: "verificado", rol: "CLIENTE", creadoEn: haceDias(30), emailVerificadoEn: haceDias(30) },
    { id: "admin", rol: "ADMIN", creadoEn: haceDias(30), emailVerificadoEn: haceDias(30) },
    // Un ADMIN sin verificar (no debería existir) tampoco se borra nunca
    { id: "admin-sin-verificar", rol: "ADMIN", creadoEn: haceDias(30), emailVerificadoEn: null },
  ];
  bd.verificaciones = [
    { id: "v1", usuarioId: "pendiente-viejo" },
    { id: "v2", usuarioId: "pendiente-nuevo" },
    { id: "v3", usuarioId: "verificado" },
    { id: "senuelo", usuarioId: null },
  ];
  bd.dispositivos = [{ id: "d1", usuarioId: "verificado" }];
});

describe("borrar una cuenta sin verificar (botón «Eliminar» del panel)", () => {
  it("borra solo la cuenta pedida, con sus códigos; las demás no se tocan", async () => {
    expect(await borrarPendientes({ id: "pendiente-nuevo" })).toBe(1);
    expect(bd.usuarios.map((u) => u.id)).toEqual([
      "pendiente-viejo",
      "verificado",
      "admin",
      "admin-sin-verificar",
    ]);
    expect(bd.verificaciones.map((v) => v.id)).toEqual(["v1", "v3", "senuelo"]);
    expect(bd.dispositivos).toHaveLength(1);
  });

  it("nunca borra una cuenta verificada ni un ADMIN, aunque se pida por su id", async () => {
    for (const id of ["verificado", "admin", "admin-sin-verificar"]) {
      expect(await borrarPendientes({ id })).toBe(0);
    }
    expect(bd.usuarios).toHaveLength(5);
    expect(bd.verificaciones).toHaveLength(4);
    expect(bd.dispositivos).toHaveLength(1);
  });
});
