import { describe, expect, it } from "vitest";
import { leerCuerpo } from "./cuerpoLimitado";

const peticion = (cuerpo: BodyInit, cabeceras: Record<string, string> = {}) =>
  new Request("http://localhost/", {
    method: "POST",
    body: cuerpo,
    headers: cabeceras,
    duplex: "half",
  } as RequestInit);

/** Un cuerpo por trozos, sin Content-Length: el caso que no se puede rechazar mirando la cabecera */
const porTrozos = (trozos: number, tamano: number) =>
  new ReadableStream<Uint8Array>({
    start(control) {
      for (let i = 0; i < trozos; i++) control.enqueue(new Uint8Array(tamano).fill(97));
      control.close();
    },
  });

describe("leerCuerpo", () => {
  it("devuelve el texto tal cual, con tildes", async () => {
    expect(await leerCuerpo(peticion('{"título":"ñ"}'), 100)).toBe('{"título":"ñ"}');
  });

  it("rechaza por la cabecera sin leer nada", async () => {
    expect(await leerCuerpo(peticion("x", { "content-length": "999" }), 100)).toBeNull();
  });

  it("corta un cuerpo por trozos en cuanto se pasa del máximo", async () => {
    expect(await leerCuerpo(peticion(porTrozos(10, 50)), 100)).toBeNull();
    expect(await leerCuerpo(peticion(porTrozos(2, 50)), 100)).toHaveLength(100);
  });

  it("el máximo cuenta bytes, no caracteres", async () => {
    expect(await leerCuerpo(peticion("ñ".repeat(60)), 100)).toBeNull();
  });
});
