/**
 * Limpieza de cuentas sin verificar: borra SOLO las pendientes antiguas de clientes, nunca una
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

const { borrarPendientes, limitePendientes, limpiarPendientesCaducados } =
  await import("./pendientes");

const AHORA = new Date("2026-10-22T12:00:00Z");
const haceDias = (dias: number) => new Date(AHORA.getTime() - dias * 24 * 60 * 60_000);

beforeEach(() => {
  bd.usuarios = [
    { id: "pendiente-viejo", rol: "CLIENTE", creadoEn: haceDias(8), emailVerificadoEn: null },
    { id: "pendiente-nuevo", rol: "CLIENTE", creadoEn: haceDias(2), emailVerificadoEn: null },
    {
      id: "verificado-viejo",
      rol: "CLIENTE",
      creadoEn: haceDias(30),
      emailVerificadoEn: haceDias(30),
    },
    { id: "admin-viejo", rol: "ADMIN", creadoEn: haceDias(30), emailVerificadoEn: haceDias(30) },
    // Un ADMIN sin verificar (no debería existir) tampoco se borra nunca solo
    { id: "admin-sin-verificar", rol: "ADMIN", creadoEn: haceDias(30), emailVerificadoEn: null },
  ];
  bd.verificaciones = [
    { id: "v1", usuarioId: "pendiente-viejo" },
    { id: "v2", usuarioId: "pendiente-nuevo" },
    { id: "v3", usuarioId: "verificado-viejo" },
    { id: "senuelo", usuarioId: null },
  ];
  bd.dispositivos = [{ id: "d1", usuarioId: "verificado-viejo" }];
});

describe("limpieza de cuentas sin verificar", () => {
  it("el límite es de 7 días", () => {
    expect(limitePendientes(AHORA)).toEqual(haceDias(7));
  });

  it("borra solo las pendientes de hace más de 7 días, con sus códigos", async () => {
    expect(await limpiarPendientesCaducados(AHORA)).toBe(1);
    expect(bd.usuarios.map((u) => u.id)).toEqual([
      "pendiente-nuevo",
      "verificado-viejo",
      "admin-viejo",
      "admin-sin-verificar",
    ]);
    expect(bd.verificaciones.map((v) => v.id)).toEqual(["v2", "v3", "senuelo"]);
    expect(bd.dispositivos).toHaveLength(1);
  });

  it("no hace nada si no hay pendientes antiguas", async () => {
    await limpiarPendientesCaducados(AHORA);
    expect(await limpiarPendientesCaducados(AHORA)).toBe(0);
    expect(bd.usuarios).toHaveLength(4);
  });

  it("nunca borra una cuenta verificada, aunque se pida por su id", async () => {
    expect(await borrarPendientes({ id: "verificado-viejo" })).toBe(0);
    expect(await borrarPendientes({ id: "admin-viejo" })).toBe(0);
    expect(bd.usuarios).toHaveLength(5);
    expect(bd.verificaciones).toHaveLength(4);
    expect(bd.dispositivos).toHaveLength(1);
  });

  it("borra una pendiente reciente si se pide por su id (botón del panel)", async () => {
    expect(await borrarPendientes({ id: "pendiente-nuevo" })).toBe(1);
    expect(bd.usuarios.some((u) => u.id === "pendiente-nuevo")).toBe(false);
    expect(bd.verificaciones.some((v) => v.usuarioId === "pendiente-nuevo")).toBe(false);
  });
});
