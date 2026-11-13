import { describe, expect, it } from "vitest";
import {
  MAX_BYTES_AUDIO,
  MAX_SEGUNDOS_AUDIO,
  duracionAudio,
  extensionAudio,
  formatoGrabacion,
  leerSegundosAudio,
  problemaAudio,
  problemaMensaje,
  resumenMensaje,
  tipoAudioBase,
  tipoAudioDeContenido,
} from "./mensajes";
import { avisoDeMensaje } from "./push";

const bytes = (...valores: number[]) => new Uint8Array([...valores, ...new Array(12).fill(0)]);
const texto = (t: string, delante = 0) =>
  new Uint8Array([
    ...new Array(delante).fill(0),
    ...[...t].map((c) => c.charCodeAt(0)),
    ...new Array(12).fill(0),
  ]);

describe("notas de voz del chat", () => {
  it("graba en MP4 si el navegador sabe (se oye también en el iPhone); si no, WebM u Ogg", () => {
    expect(formatoGrabacion(() => true)).toBe("audio/mp4;codecs=mp4a.40.2");
    expect(formatoGrabacion((t) => t.startsWith("audio/webm"))).toBe("audio/webm;codecs=opus");
    expect(formatoGrabacion((t) => t.startsWith("audio/ogg"))).toBe("audio/ogg;codecs=opus");
    expect(formatoGrabacion(() => false)).toBe("");
  });

  it("entiende el tipo que dice el navegador, sin los codecs", () => {
    expect(tipoAudioBase("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(tipoAudioBase("audio/mp4")).toBe("audio/mp4");
    expect(tipoAudioBase("video/webm")).toBe("audio/webm");
    expect(tipoAudioBase("audio/mpeg")).toBeNull();
    expect(tipoAudioBase("image/png")).toBeNull();
  });

  it("reconoce el audio por su contenido, no por su nombre", () => {
    expect(tipoAudioDeContenido(bytes(0x1a, 0x45, 0xdf, 0xa3))).toBe("audio/webm");
    expect(tipoAudioDeContenido(texto("OggS"))).toBe("audio/ogg");
    expect(tipoAudioDeContenido(texto("ftypM4A ", 4))).toBe("audio/mp4");
    expect(tipoAudioDeContenido(texto("<html>"))).toBeNull();
    expect(tipoAudioDeContenido(new Uint8Array([0x1a]))).toBeNull();
    expect(extensionAudio("audio/mp4")).toBe("m4a");
    expect(extensionAudio("audio/ogg")).toBe("ogg");
    expect(extensionAudio("audio/webm")).toBe("webm");
  });

  it("comprueba la duración que manda el navegador", () => {
    expect(leerSegundosAudio("12")).toBe(12);
    expect(leerSegundosAudio("3,6")).toBe(4);
    expect(leerSegundosAudio(MAX_SEGUNDOS_AUDIO + 1)).toBe(MAX_SEGUNDOS_AUDIO);
    expect(leerSegundosAudio("0.3")).toBeNull();
    expect(leerSegundosAudio(MAX_SEGUNDOS_AUDIO + 60)).toBeNull();
    expect(leerSegundosAudio("hola")).toBeNull();
    expect(leerSegundosAudio(null)).toBeNull();
  });

  it("no deja enviar audios raros, vacíos o enormes", () => {
    expect(problemaAudio({ type: "audio/webm;codecs=opus", size: 20_000 }, 5)).toBeNull();
    expect(problemaAudio({ type: "application/pdf", size: 20_000 }, 5)).toMatch(/formato/);
    expect(problemaAudio({ type: "audio/mp4", size: 0 }, 5)).toMatch(/vacía/);
    expect(problemaAudio({ type: "audio/mp4", size: MAX_BYTES_AUDIO + 1 }, 5)).toMatch(/pesa/);
    expect(problemaAudio({ type: "audio/mp4", size: 100 }, null)).toMatch(/corta/);
  });

  it("una nota de voz puede ir sin texto", () => {
    expect(problemaMensaje("", true)).toBeNull();
  });

  it("en la lista de chats, en el correo y en el aviso sale «🎤 Nota de voz (0:12)»", () => {
    expect(duracionAudio(5)).toBe("0:05");
    expect(duracionAudio(75)).toBe("1:15");
    expect(duracionAudio(300)).toBe("5:00");
    expect(resumenMensaje("", false, 12)).toBe("🎤 Nota de voz (0:12)");
    expect(resumenMensaje("Hola", false, null)).toBe("Hola");
    const aviso = avisoDeMensaje({
      de: "Dani",
      texto: "",
      conImagen: false,
      segundosAudio: 75,
      esTarea: false,
      tareaParaTi: false,
      ruta: "hardware",
    });
    expect(aviso.titulo).toBe("Dani · Hardware");
    expect(aviso.cuerpo).toBe("🎤 Nota de voz (1:15)");
  });
});
