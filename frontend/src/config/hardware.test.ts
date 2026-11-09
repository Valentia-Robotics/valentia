import { describe, expect, it } from "vitest";
import {
  cabeceraDescarga,
  carpetaDeRuta,
  esArchivoDelSistema,
  limpiarCarpeta,
  limpiarNombreArchivo,
  migasDeCarpeta,
  verCarpeta,
  tamanoLegible,
} from "./hardware";

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
    expect(limpiarCarpeta("a/b/c/d/e/f/g/h")).toBe("a/b/c/d/e/f/g/h");
    expect(limpiarCarpeta("a/b/c/d/e/f/g/h/i")).toBeNull();
    expect(limpiarCarpeta("con:dos puntos")).toBeNull();
    expect(limpiarCarpeta("bien")).toBe("bien");
  });

  it("coloca cada archivo de una carpeta subida en su subcarpeta", () => {
    expect(carpetaDeRuta("", "Coche/PCB/placa.kicad_pcb")).toBe("Coche/PCB");
    expect(carpetaDeRuta("Proyectos", "Coche/placa.step")).toBe("Proyectos/Coche");
    expect(carpetaDeRuta("", "suelto.pdf")).toBe("");
    expect(carpetaDeRuta("", "Versión: 2/a.txt")).toBe("Versión_ 2");
    expect(carpetaDeRuta("", "a/../b.txt")).toBe("a/_");
    expect(carpetaDeRuta("", "1/2/3/4/5/6/7/8/9/x.txt")).toBeNull();
    expect(carpetaDeRuta("", `${"x".repeat(80)}/a.txt`)).toBe("x".repeat(60));
  });

  it("no sube los archivos que crea solo el ordenador", () => {
    expect(esArchivoDelSistema("Coche/.DS_Store")).toBe(true);
    expect(esArchivoDelSistema("Coche/.git/config")).toBe(true);
    expect(esArchivoDelSistema("Coche/Thumbs.db")).toBe(true);
    expect(esArchivoDelSistema("Coche/~$informe.docx")).toBe(true);
    expect(esArchivoDelSistema("Coche/PCB/placa.kicad_pcb")).toBe(false);
  });

  it("enseña cada carpeta como en el explorador", () => {
    const archivos = [
      { nombre: "leeme.txt", carpeta: "", tamano: 1 },
      { nombre: "placa.pcb", carpeta: "Coche/PCB", tamano: 10 },
      { nombre: "b.step", carpeta: "Coche", tamano: 5 },
      { nombre: "a.step", carpeta: "Coche", tamano: 5 },
      { nombre: "gerber.zip", carpeta: "Coche/PCB/Gerbers", tamano: 20 },
      { nombre: "x", carpeta: "Brazo 10", tamano: 1 },
      { nombre: "y", carpeta: "Brazo 2", tamano: 1 },
      { nombre: "z", carpeta: "Cochera", tamano: 1 },
    ];
    const raiz = verCarpeta(archivos, "");
    expect(raiz.archivos.map((a) => a.nombre)).toEqual(["leeme.txt"]);
    expect(raiz.carpetas.map((c) => c.nombre)).toEqual(["Brazo 2", "Brazo 10", "Coche", "Cochera"]);
    expect(raiz.carpetas[2]).toEqual({ nombre: "Coche", ruta: "Coche", archivos: 4, bytes: 40 });
    const coche = verCarpeta(archivos, "Coche");
    expect(coche.archivos.map((a) => a.nombre)).toEqual(["a.step", "b.step"]);
    expect(coche.carpetas).toEqual([{ nombre: "PCB", ruta: "Coche/PCB", archivos: 2, bytes: 30 }]);
    expect(verCarpeta(archivos, "No existe")).toEqual({ carpetas: [], archivos: [] });
    expect(migasDeCarpeta("Coche/PCB")).toEqual([
      { nombre: "Coche", ruta: "Coche" },
      { nombre: "PCB", ruta: "Coche/PCB" },
    ]);
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
