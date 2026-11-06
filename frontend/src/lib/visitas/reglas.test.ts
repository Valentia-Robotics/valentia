import { describe, expect, it } from "vitest";
import {
  calcularOrigen,
  diaEnEspana,
  esRobot,
  normalizarRuta,
  tipoDispositivo,
  ultimosDias,
} from "./reglas";

describe("normalizarRuta", () => {
  it("quita parámetros y la barra final", () => {
    expect(normalizarRuta("/kits/coche?utm_source=x#a")).toBe("/kits/coche");
    expect(normalizarRuta("/kits/")).toBe("/kits");
    expect(normalizarRuta("/")).toBe("/");
  });
  it("no cuenta el panel ni las rutas internas", () => {
    expect(normalizarRuta("/admin")).toBeNull();
    expect(normalizarRuta("/admin/pedidos")).toBeNull();
    expect(normalizarRuta("/api/visitas")).toBeNull();
    expect(normalizarRuta("/dev/correos")).toBeNull();
    expect(normalizarRuta("/administracion-de-robots")).toBe("/administracion-de-robots");
  });
  it("agrupa las páginas con datos de una persona", () => {
    expect(normalizarRuta("/pedido/abc123")).toBe("/pedido");
    expect(normalizarRuta("/cursos/coche/leccion-1/test")).toBe("/cursos/coche");
  });
  it("rechaza lo que no es una ruta", () => {
    expect(normalizarRuta("https://otra.com/")).toBeNull();
    expect(normalizarRuta(42)).toBeNull();
    expect(normalizarRuta("/" + "a".repeat(400))).toBeNull();
  });
});

describe("calcularOrigen", () => {
  const propio = "valentiarobotics.com";
  it("pone nombre a las webs conocidas", () => {
    expect(calcularOrigen("https://www.google.es/", "", propio)).toBe("Google");
    expect(calcularOrigen("https://l.instagram.com/?u=x", "", propio)).toBe("Instagram");
    expect(calcularOrigen("https://t.co/abc", "", propio)).toBe("X (Twitter)");
    expect(calcularOrigen("https://blog.ejemplo.com/post", "", propio)).toBe("blog.ejemplo.com");
  });
  it("la etiqueta utm_source manda", () => {
    expect(calcularOrigen("https://www.google.es/", "instagram", propio)).toBe("Instagram");
    expect(calcularOrigen("", "Folleto", propio)).toBe("Folleto");
  });
  it("sin referente o desde la propia web: directo (null)", () => {
    expect(calcularOrigen("", "", propio)).toBeNull();
    expect(calcularOrigen("https://www.valentiarobotics.com/kits", "", propio)).toBeNull();
    expect(calcularOrigen("no es una url", "", propio)).toBeNull();
  });
});

describe("navegador", () => {
  it("reconoce robots", () => {
    expect(esRobot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(esRobot("Mozilla/5.0 HeadlessChrome/120")).toBe(true);
    expect(esRobot(null)).toBe(true);
    expect(esRobot("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36")).toBe(false);
  });
  it("distingue móvil, tableta y ordenador", () => {
    expect(tipoDispositivo("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("movil");
    expect(tipoDispositivo("Mozilla/5.0 (Linux; Android 14) Mobile Safari")).toBe("movil");
    expect(tipoDispositivo("Mozilla/5.0 (Linux; Android 14) Safari")).toBe("tableta");
    expect(tipoDispositivo("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tableta");
    expect(tipoDispositivo("Mozilla/5.0 (X11; Ubuntu; Linux x86_64) Firefox/131")).toBe(
      "ordenador",
    );
  });
});

describe("días", () => {
  it("usa la hora de España", () => {
    // 23:30 en UTC del 27 = 00:30 del 28 en Madrid (horario de invierno)
    expect(diaEnEspana(new Date("2026-10-27T23:30:00Z"))).toBe("2026-10-28");
  });
  it("lista los últimos días sin saltar ni repetir con el cambio de hora", () => {
    const dias = ultimosDias(7, new Date("2026-10-27T10:00:00Z"));
    expect(dias).toEqual([
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
    ]);
  });
});
