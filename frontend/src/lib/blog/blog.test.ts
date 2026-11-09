import { describe, expect, it } from "vitest";
import { revisarCalidad, type DatosParaRevisar } from "./calidad";
import { cuandoSaldra, enMadrid, fechaEnMadrid, tocaPublicar } from "./cola";
import {
  contarPalabras,
  contarSubtitulos,
  crearSlug,
  extractoDe,
  markdownAHtml,
  recortar,
  similitud,
  slugDeKit,
} from "./texto";

describe("markdownAHtml", () => {
  it("convierte el Markdown y quita lo peligroso", () => {
    const html = markdownAHtml(
      '# Título\n\nHola <script>alert(1)</script> **robot**.\n\n<img src=x onerror="alert(1)">\n\n<iframe src="https://mal.com"></iframe>',
    );
    expect(html).toContain("<h2>Título</h2>");
    expect(html).toContain("<strong>robot</strong>");
    expect(html).not.toMatch(/script|onerror|iframe/);
  });

  it("enlaces externos con nofollow; javascript: fuera", () => {
    const html = markdownAHtml("[a](https://x.com) [b](/kits) [c](javascript:alert(1))");
    expect(html).toContain('href="https://x.com" rel="noopener noreferrer nofollow" target="_blank"');
    expect(html).toContain('href="/kits"');
    expect(html).not.toContain("javascript:");
  });

  it("solo imágenes de bancos libres", () => {
    const html = markdownAHtml(
      "![a](https://images.unsplash.com/foto.jpg) ![b](https://xataka.com/foto.jpg)",
    );
    expect(html).toContain("images.unsplash.com");
    expect(html).not.toContain("xataka.com");
  });
});

describe("cuentas de texto", () => {
  it("palabras, subtítulos y extracto", () => {
    const html = markdownAHtml("Primer párrafo con cinco palabras.\n\n## Uno\n\nMás.\n\n## Dos");
    expect(contarPalabras(html)).toBe(8);
    expect(contarSubtitulos(html)).toBe(2);
    expect(extractoDe(html)).toBe("Primer párrafo con cinco palabras.");
  });

  it("recorta sin partir palabras", () => {
    expect(recortar("uno dos tres cuatro", 12)).toBe("uno dos…");
    expect(recortar("corto", 60)).toBe("corto");
  });

  it("slug limpio y sin chocar con las carpetas del blog", () => {
    expect(crearSlug("¿Qué es un ESP32? Guía 2026")).toBe("que-es-un-esp32-guia-2026");
    expect(crearSlug("Página")).toBe("pagina-articulo");
    expect(crearSlug("¡¡!!")).toBe("articulo");
  });

  it("kit por slug, ruta o dirección completa", () => {
    expect(slugDeKit("https://valentiarobotics.com/kits/brazo-robotico/")).toBe("brazo-robotico");
    expect(slugDeKit("/kits/coche")).toBe("coche");
    expect(slugDeKit("coche")).toBe("coche");
  });

  it("similitud de títulos", () => {
    expect(similitud("Cómo programar un robot con ESP32", "Programar robot ESP32 fácil")).toBe(0.75);
    expect(similitud("Robots que doblan ropa", "Nueva placa Arduino")).toBe(0);
  });
});

describe("revisarCalidad", () => {
  const bueno: DatosParaRevisar = {
    titulo: "Cómo funciona un sensor de ultrasonidos",
    palabraClave: "sensor ultrasonidos",
    palabras: 900,
    subtitulos: 3,
    categoria: "electronica",
    kitsPedidos: ["coche"],
    kitsQueExisten: ["coche", "brazo"],
    imagenUrl: "https://images.pexels.com/a.jpg",
    imagenAlt: "Sensor",
    recientes: [{ titulo: "Nueva placa Arduino", palabraClave: "arduino" }],
  };

  it("un buen artículo pasa", () => {
    expect(revisarCalidad(bueno)).toEqual([]);
  });

  it("explica cada fallo", () => {
    const motivos = revisarCalidad({
      ...bueno,
      palabras: 300,
      subtitulos: 1,
      categoria: "cocina",
      kitsPedidos: ["dron"],
      imagenUrl: "https://xataka.com/a.jpg",
      recientes: [{ titulo: "Otro", palabraClave: "Sensor  ULTRASONIDOS" }],
    });
    expect(motivos).toHaveLength(6);
    expect(motivos.join(" ")).toMatch(/300 palabras.*subtítulos.*categoría.*dron.*licencia.*Otro/);
  });
});

describe("cola de publicación (hora de Madrid)", () => {
  // 9 de noviembre de 2026: invierno, Madrid = UTC+1
  const a = (iso: string) => new Date(iso);

  it("hora de Madrid, también en verano", () => {
    expect(enMadrid(a("2026-11-09T08:30:00Z"))).toEqual({ dia: "2026-11-09", minutos: 570 });
    expect(fechaEnMadrid("2026-11-09", 600).toISOString()).toBe("2026-11-09T09:00:00.000Z");
    expect(fechaEnMadrid("2026-07-01", 600).toISOString()).toBe("2026-07-01T08:00:00.000Z");
  });

  it("solo publica desde la hora y hasta los del día", () => {
    expect(tocaPublicar(a("2026-11-09T08:30:00Z"), "10:00", 1, 0)).toBe(false);
    expect(tocaPublicar(a("2026-11-09T09:05:00Z"), "10:00", 1, 0)).toBe(true);
    expect(tocaPublicar(a("2026-11-09T12:00:00Z"), "10:00", 1, 1)).toBe(false);
  });

  it("calcula cuándo saldrá cada uno de la cola", () => {
    const antes = a("2026-11-09T07:00:00Z"); // 08:00 en Madrid
    expect(cuandoSaldra(antes, "10:00", 1, 0, 0).toISOString()).toBe("2026-11-09T09:00:00.000Z");
    expect(cuandoSaldra(antes, "10:00", 1, 0, 1).toISOString()).toBe("2026-11-10T09:00:00.000Z");
    expect(cuandoSaldra(antes, "10:00", 1, 1, 0).toISOString()).toBe("2026-11-10T09:00:00.000Z");
  });
});
