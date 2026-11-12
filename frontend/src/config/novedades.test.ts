import { describe, expect, it } from "vitest";
import {
  envioCortado,
  esquemaCorreoNovedades,
  parrafosDeTexto,
  recibeNovedades,
} from "./novedades";

const base = {
  asunto: "Kit nuevo",
  titulo: "Ya está aquí",
  texto: "Hola, tenemos kit nuevo.",
  botonTexto: "",
  botonUrl: "",
};

describe("correos de novedades", () => {
  it("solo los recibe quien dijo que sí", () => {
    expect(recibeNovedades(true)).toBe(true);
    expect(recibeNovedades(false)).toBe(false);
    expect(recibeNovedades(null)).toBe(false);
    expect(recibeNovedades(undefined)).toBe(false);
  });

  it("parte el texto en párrafos y respeta los saltos sueltos", () => {
    expect(parrafosDeTexto("Uno\r\ndos\n\n\n  Tres  \n")).toEqual([["Uno", "dos"], ["Tres"]]);
    expect(parrafosDeTexto("   \n\n ")).toEqual([]);
  });

  it("valida el botón: los dos campos o ninguno, y direcciones seguras", () => {
    expect(esquemaCorreoNovedades.safeParse(base).success).toBe(true);
    const ok = (botonUrl: string) =>
      esquemaCorreoNovedades.safeParse({ ...base, botonTexto: "Ver", botonUrl }).success;
    expect(ok("/kits/vr1-starter-kit")).toBe(true);
    expect(ok("https://valentiarobotics.com/kits")).toBe(true);
    expect(ok("http://otra.com")).toBe(false);
    expect(ok("//otra.com")).toBe(false);
    expect(ok("javascript:alert(1)")).toBe(false);
    expect(ok('/kits" onclick="x')).toBe(false);
    expect(ok("https://")).toBe(false);
    expect(esquemaCorreoNovedades.safeParse({ ...base, botonTexto: "Ver" }).success).toBe(false);
    expect(esquemaCorreoNovedades.safeParse({ ...base, botonUrl: "/kits" }).success).toBe(false);
  });

  it("sabe si un envío se cortó", () => {
    const ahora = new Date("2026-11-12T12:00:00Z");
    const hace = (min: number) => new Date(ahora.getTime() - min * 60_000);
    expect(envioCortado({ terminadoEn: null, avanceEn: hace(1) }, ahora)).toBe(false);
    expect(envioCortado({ terminadoEn: null, avanceEn: hace(10) }, ahora)).toBe(true);
    expect(envioCortado({ terminadoEn: hace(0), avanceEn: hace(10) }, ahora)).toBe(false);
  });
});
