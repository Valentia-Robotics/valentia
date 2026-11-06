import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OPCIONALES, conNulos } from "./nulos";

/** Campos opcionales (Tipo?) de cada modelo del esquema: escalares y enums (sin Json ni relaciones) */
function opcionalesDelEsquema(): Record<string, string[]> {
  const esquema = readFileSync("prisma/schema.prisma", "utf8");
  const enums = [...esquema.matchAll(/^enum (\w+)/gm)].map(([, nombre]) => nombre);
  const tipos = new Set(["String", "Int", "Float", "Boolean", "DateTime", ...enums]);
  const modelos: Record<string, string[]> = {};
  for (const [, nombre, cuerpo] of esquema.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)) {
    const campos = [...cuerpo.matchAll(/^ {2}(\w+)\s+(\w+)\?/gm)]
      .filter(([, , tipo]) => tipos.has(tipo))
      .map(([, campo]) => campo);
    if (campos.length > 0) modelos[nombre] = campos;
  }
  return modelos;
}

describe("campos opcionales guardados como null (MongoDB)", () => {
  it("la lista coincide con prisma/schema.prisma", () => {
    const lista = Object.fromEntries(
      Object.entries(OPCIONALES).map(([modelo, campos]) => [modelo, campos.map((c) => c.campo)]),
    );
    expect(lista).toEqual(opcionalesDelEsquema());
  });

  it("rellena con null lo que falta y respeta lo que llega", () => {
    expect(conNulos("Verificacion", { email: "a@b.es", usadoEn: new Date(0) })).toEqual({
      email: "a@b.es",
      usadoEn: new Date(0),
      usuarioId: null,
      confirmadoEn: null,
    });
  });

  it("no añade la clave foránea si llega la relación", () => {
    const datos = conNulos("Pedido", { usuario: { connect: { id: "x" } } }) as Record<string, unknown>;
    expect("usuarioId" in datos).toBe(false);
    expect(datos.pagadoEn).toBeNull();
  });
});
