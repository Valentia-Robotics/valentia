import { describe, expect, it } from "vitest";
import {
  avisoDeMensaje,
  avisoDeRecordatorio,
  leerSuscripcion,
  nombreAparato,
  recortar,
} from "./push";

describe("avisos push", () => {
  it("dice quién escribe, como WhatsApp", () => {
    const privado = avisoDeMensaje({
      de: "Dani",
      texto: "¿Has visto el pedido?",
      conImagen: false,
      esTarea: false,
      tareaParaTi: false,
      ruta: "abc",
    });
    expect(privado).toMatchObject({
      titulo: "Dani",
      cuerpo: "¿Has visto el pedido?",
      url: "/mensajes/abc",
      etiqueta: "chat-abc",
    });
    const general = avisoDeMensaje({
      de: "Marina",
      texto: "",
      conImagen: true,
      esTarea: false,
      tareaParaTi: false,
      ruta: "general",
    });
    expect(general.titulo).toBe("Marina · General");
    expect(general.cuerpo).toBe("📷 Imagen");
    const tarea = avisoDeMensaje({
      de: "Jesse",
      texto: "Montar 5 coches",
      conImagen: false,
      esTarea: true,
      tareaParaTi: true,
      ruta: "general",
    });
    expect(tarea.cuerpo).toBe("📋 Tarea para ti: Montar 5 coches");
  });

  it("recorta los textos largos y junta los espacios", () => {
    expect(recortar("a  b\n\nc")).toBe("a b c");
    expect(recortar("x".repeat(300)).length).toBe(180);
    expect(
      avisoDeRecordatorio({ id: "1", texto: "Llamar", entrega: "12 nov, 10:00", ruta: "general" })
        .cuerpo,
    ).toBe("Llamar · Entrega: 12 nov, 10:00");
  });

  it("pone nombre al aparato", () => {
    expect(
      nombreAparato(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("iPhone · Safari");
    expect(
      nombreAparato(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
      ),
    ).toBe("Android · Chrome");
    expect(
      nombreAparato(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0",
      ),
    ).toBe("Windows · Edge");
    expect(nombreAparato("")).toBe("Otro · navegador");
  });

  it("solo acepta suscripciones de verdad", () => {
    const buena = {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "BNc-x_1", auth: "a1_-" },
    };
    expect(leerSuscripcion(buena)).toEqual({
      endpoint: buena.endpoint,
      p256dh: "BNc-x_1",
      auth: "a1_-",
    });
    expect(leerSuscripcion({ ...buena, endpoint: "http://fcm.googleapis.com/x" })).toBeNull();
    expect(leerSuscripcion({ ...buena, endpoint: "https://127.0.0.1/x" })).toBeNull();
    expect(leerSuscripcion({ ...buena, endpoint: "https://localhost/x" })).toBeNull();
    expect(
      leerSuscripcion({ endpoint: buena.endpoint, keys: { p256dh: "<script>", auth: "a" } }),
    ).toBeNull();
    expect(leerSuscripcion(null)).toBeNull();
    expect(leerSuscripcion("hola")).toBeNull();
  });
});
