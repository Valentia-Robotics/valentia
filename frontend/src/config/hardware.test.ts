import { describe, expect, it } from "vitest";
import { cabeceraDescarga, limpiarCarpeta, limpiarNombreArchivo, tamanoLegible } from "./hardware";

describe("espacios de hardware", () => {
  it("limpia los nombres de archivo", () => {
    expect(limpiarNombreArchivo("placa base v2.kicad_pcb")).toBe("placa base v2.kicad_pcb");
    expect(limpiarNombreArchivo("../../.env")).toBe("env");
    expect(limpiarNombreArchivo("C:\\Users\\ana\\esquema.pdf")).toBe("esquema.pdf");
    expect(limpiarNombreArchivo('a<b>:"c|?*.txt')).toBe("a_b___c___.txt");
    expect(limpiarNombreArchivo("   ")).toBe("archivo");
    const largo = limpiarNombreArchivo(`${"x".repeat(300)}.step`);
    expect(largo.length).toBe(150);
    expect(largo.endsWith(".step")).toBe(true);
  });

  it("limpia las carpetas y rechaza las peligrosas", () => {
    expect(limpiarCarpeta("")).toBe("");
    expect(limpiarCarpeta(" Coche VR1 /  PCB ")).toBe("Coche VR1/PCB");
    expect(limpiarCarpeta("a\\b")).toBe("a/b");
    expect(limpiarCarpeta("../secreto")).toBeNull();
    expect(limpiarCarpeta("a/b/c/d/e")).toBeNull();
    expect(limpiarCarpeta("con:dos puntos")).toBeNull();
    expect(limpiarCarpeta("bien")).toBe("bien");
  });

  it("dice los tamaños en español", () => {
    expect(tamanoLegible(500)).toBe("500 bytes");
    expect(tamanoLegible(1536)).toBe("1,5 KB");
    expect(tamanoLegible(50 * 1024 * 1024)).toBe("50 MB");
  });

  it("descarga con el nombre original, también con acentos", () => {
    expect(cabeceraDescarga("diseño final.pdf")).toBe(
      `attachment; filename="dise_o final.pdf"; filename*=UTF-8''dise%C3%B1o%20final.pdf`,
    );
  });
});
