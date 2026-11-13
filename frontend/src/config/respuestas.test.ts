import { describe, expect, it } from "vitest";
import {
  DESLIZAR_MAXIMO,
  MAX_CARACTERES_CITA,
  autorCita,
  deslizadoBastante,
  desplazamientoDeslizar,
  textoCita,
} from "./respuestas";

describe("respuestas: el extracto de la cita", () => {
  it("usa el texto del mensaje, en una sola línea", () => {
    expect(textoCita({ texto: "Hola\n\nequipo", conImagen: false, segundosAudio: null })).toBe(
      "Hola equipo",
    );
  });
  it("dice qué es si no hay texto: foto, nota de voz, sticker o tarea", () => {
    expect(textoCita({ texto: "", conImagen: true, segundosAudio: null })).toBe("📷 Foto");
    expect(textoCita({ texto: "Mira", conImagen: true, segundosAudio: null })).toBe("📷 Mira");
    expect(textoCita({ texto: "", conImagen: false, segundosAudio: 75 })).toBe(
      "🎤 Nota de voz (1:15)",
    );
    expect(textoCita({ texto: "", conImagen: true, segundosAudio: null, esSticker: true })).toBe(
      "💟 Sticker",
    );
    expect(
      textoCita({ texto: "Montar el kit", conImagen: false, segundosAudio: null, esTarea: true }),
    ).toBe("📋 Montar el kit");
  });
  it("corta los textos largos", () => {
    const largo = "a".repeat(500);
    const cita = textoCita({ texto: largo, conImagen: false, segundosAudio: null });
    expect(cita.length).toBe(MAX_CARACTERES_CITA);
    expect(cita.endsWith("…")).toBe(true);
  });
  it("pone «Tú» si el citado es mío", () => {
    expect(autorCita({ autorId: "a", autorNombre: "Jesse" }, "a")).toBe("Tú");
    expect(autorCita({ autorId: "b", autorNombre: "Dani" }, "a")).toBe("Dani");
    expect(autorCita({ autorId: null, autorNombre: "Antiguo" }, "a")).toBe("Antiguo");
  });
});

describe("respuestas: deslizar para responder", () => {
  it("solo hacia la derecha y más horizontal que vertical", () => {
    expect(desplazamientoDeslizar(-30, 0)).toBeNull();
    expect(desplazamientoDeslizar(20, 40)).toBeNull();
    expect(desplazamientoDeslizar(30, 5)).toBe(30);
  });
  it("no se pasa del máximo y responde a partir del umbral", () => {
    expect(desplazamientoDeslizar(400, 0)).toBe(DESLIZAR_MAXIMO);
    expect(deslizadoBastante(40, 0)).toBe(false);
    expect(deslizadoBastante(70, 10)).toBe(true);
    expect(deslizadoBastante(70, 90)).toBe(false);
  });
});
