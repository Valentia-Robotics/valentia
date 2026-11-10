import { describe, expect, it } from "vitest";
import { enLinea, esDelEquipo, nombreRol, puedeEditarGuiones, textoConexion } from "./equipo";

// 9 nov 2026, 15:00 en Madrid (14:00 UTC)
const ahora = new Date("2026-11-09T14:00:00Z");
const hace = (min: number) => new Date(ahora.getTime() - min * 60_000);

describe("última conexión del equipo", () => {
  it("dice la conexión como una persona", () => {
    expect(textoConexion(null, ahora)).toMatch(/^Nunca/);
    expect(textoConexion(hace(2), ahora)).toBe("Conectado ahora");
    expect(textoConexion(hace(12), ahora)).toBe("Hace 12 min");
    expect(textoConexion(hace(150), ahora)).toBe("Hoy a las 12:30");
    expect(textoConexion(new Date("2026-11-08T17:05:00Z"), ahora)).toBe("Ayer a las 18:05");
    expect(textoConexion(new Date("2026-11-03T08:15:00Z"), ahora)).toMatch(
      /^3 nov 2026 a las 9:15$/,
    );
  });

  it("en línea solo con actividad reciente", () => {
    expect(enLinea(hace(1), ahora)).toBe(true);
    expect(enLinea(hace(6), ahora)).toBe(false);
    expect(enLinea(null, ahora)).toBe(false);
  });

  it("los clientes no son del equipo", () => {
    expect(esDelEquipo("EDITOR")).toBe(true);
    expect(esDelEquipo("ADMIN")).toBe(true);
    expect(esDelEquipo("CLIENTE")).toBe(false);
  });
});

describe("puestos en masculino o femenino y admins que también editan", () => {
  it("nombra el puesto según lo elegido", () => {
    expect(nombreRol("EDITOR", false)).toBe("Editor");
    expect(nombreRol("EDITOR", true)).toBe("Editora");
    expect(nombreRol("ADMIN", true)).toBe("Administradora");
    expect(nombreRol("ADMIN", null)).toBe("Administrador");
    expect(nombreRol("CLIENTE", true)).toBe("Cliente");
  });

  it("trabaja como editor el rol EDITOR y el admin que también edita", () => {
    expect(puedeEditarGuiones({ rol: "EDITOR" })).toBe(true);
    expect(puedeEditarGuiones({ rol: "ADMIN", tambienEditor: true })).toBe(true);
    expect(puedeEditarGuiones({ rol: "ADMIN", tambienEditor: null })).toBe(false);
    expect(puedeEditarGuiones({ rol: "HARDWARE", tambienEditor: true })).toBe(false);
    expect(puedeEditarGuiones({ rol: "CLIENTE" })).toBe(false);
  });
});
