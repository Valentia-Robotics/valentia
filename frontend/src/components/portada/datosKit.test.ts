import { describe, expect, it } from "vitest";
import { cuantosKits, enLaCaja, queHace } from "./datosKit";

describe("datos del kit en la portada", () => {
  it("quita de «qué hace» lo del curso y lo de soldar", () => {
    expect(
      queHace([
        "Sigue líneas con dos sensores infrarrojos",
        "Sin soldar: todo se enchufa y encaja",
        "Curso de 5 lecciones incluido",
      ]),
    ).toEqual(["Sigue líneas con dos sensores infrarrojos"]);
  });

  it("pone la cantidad, las baterías solo si hay portapilas, el cable USB y la tarjeta", () => {
    const coche = enLaCaja([
      { cantidad: 1, componente: { nombre: "Placa ESP32", categoria: "PLACAS" } },
      { cantidad: 2, componente: { nombre: "Motor DC", categoria: "MOTORES" } },
      { cantidad: 1, componente: { nombre: "Portapilas", categoria: "ALIMENTACION" } },
    ]);
    expect(coche[0]).toBe("Placa ESP32");
    expect(coche[1]).toBe("2 × Motor DC");
    expect(coche.some((t) => t.startsWith("Baterías"))).toBe(true);
    expect(coche.at(-2)).toMatch(/Cable USB/);
    expect(coche.at(-1)).toMatch(/QR/);

    const estacion = enLaCaja([
      { cantidad: 1, componente: { nombre: "Placa ESP32", categoria: "PLACAS" } },
    ]);
    expect(estacion.some((t) => t.startsWith("Baterías"))).toBe(false);
  });

  it("escribe el número de kits en letra", () => {
    expect(cuantosKits(1, true)).toBe("Un kit");
    expect(cuantosKits(3, true)).toBe("Tres kits");
    expect(cuantosKits(2)).toBe("dos kits");
    expect(cuantosKits(12)).toBe("12 kits");
  });
});
