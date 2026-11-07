import { describe, expect, it } from "vitest";
import { esquemaGuionAutomatico, limpiarTexto, normalizarUrl } from "./guionAutomatico";

const minimo = {
  titulo: "Robot que dobla ropa",
  escenas: [{ voz: "Mira esto" }],
  fuente: { url: "https://xataka.com/noticia" },
};

describe("limpiarTexto", () => {
  it("quita etiquetas HTML y caracteres de control, y conserva el resto", () => {
    expect(limpiarTexto(' <img src=x onerror="alert(1)">Hola <b>robot</b>\u0007 ')).toBe(
      "Hola robot",
    );
    expect(limpiarTexto("3 < 5 y ñandú")).toBe("3 < 5 y ñandú");
    expect(limpiarTexto("línea 1\nlínea 2")).toBe("línea 1\nlínea 2");
  });
});

describe("normalizarUrl", () => {
  it("la misma noticia con #ancla o utm_ es la misma", () => {
    expect(normalizarUrl("https://a.com/n?utm_source=x&id=3#arriba")).toBe("https://a.com/n?id=3");
    expect(normalizarUrl("https://A.com/n")).toBe("https://a.com/n");
  });
});

describe("esquemaGuionAutomatico", () => {
  it("con lo mínimo vale, y los opcionales quedan vacíos", () => {
    const g = esquemaGuionAutomatico.parse(minimo);
    expect(g.hashtags).toEqual([]);
    expect(g.datosAVerificar).toEqual([]);
    expect(g.escenas[0]).toMatchObject({ voz: "Mira esto", visual: "" });
  });

  it("perdona lo secundario mal escrito en vez de rechazar el guion", () => {
    const g = esquemaGuionAutomatico.parse({
      ...minimo,
      relevancia: "8.4",
      generadoEn: "ayer",
      fuente: { url: "https://xataka.com/n", fecha: "no es fecha" },
      escenas: [{ orden: "dos", duracionSegundos: "10", voz: "Hola" }],
    });
    expect(g.relevancia).toBe(8);
    expect(g.generadoEn).toBeUndefined();
    expect(g.fuente.fecha).toBeUndefined();
    expect(g.escenas[0]).toMatchObject({ orden: undefined, duracionSegundos: 10 });
  });

  it("rechaza una escena vacía y una URL que no es web", () => {
    expect(esquemaGuionAutomatico.safeParse({ ...minimo, escenas: [{}] }).success).toBe(false);
    for (const url of ["javascript:alert(1)", "ftp://a.com", "no-es-url"]) {
      expect(esquemaGuionAutomatico.safeParse({ ...minimo, fuente: { url } }).success).toBe(false);
    }
  });

  it("un título que solo era HTML se queda vacío y no vale", () => {
    expect(esquemaGuionAutomatico.safeParse({ ...minimo, titulo: "<b></b>" }).success).toBe(false);
  });
});
