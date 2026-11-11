import { describe, expect, it } from "vitest";
import {
  CANAL_GENERAL,
  calcularRecordatorio,
  canalDeRuta,
  leerDatosTarea,
  vencida,
  canalPrivado,
  limpiarMensaje,
  MAX_CARACTERES_MENSAJE,
  personasDelCanal,
  problemaMensaje,
  textoDia,
  trozosConEnlaces,
} from "./mensajes";

const dani = "a".repeat(24);
const marina = "b".repeat(24);

describe("mensajes del equipo", () => {
  it("el chat privado de dos personas es el mismo lo abra quien lo abra", () => {
    expect(canalPrivado(dani, marina)).toBe(canalPrivado(marina, dani));
    expect(personasDelCanal(canalPrivado(marina, dani))).toEqual([dani, marina]);
    expect(personasDelCanal(CANAL_GENERAL)).toBeNull();
    expect(personasDelCanal("privado:hola_adios")).toBeNull();
  });

  it("la dirección de un chat solo vale para el General o el id de otra persona", () => {
    expect(canalDeRuta("general", dani)).toBe(CANAL_GENERAL);
    expect(canalDeRuta(marina, dani)).toBe(canalPrivado(dani, marina));
    expect(canalDeRuta(dani, dani)).toBeNull(); // contigo mismo, no
    expect(canalDeRuta("../admin", dani)).toBeNull();
  });

  it("limpia el texto y rechaza los vacíos o muy largos", () => {
    expect(limpiarMensaje("  Hola  \r\n\r\n\r\n\r\nDani  ")).toBe("Hola\n\nDani");
    expect(problemaMensaje("")).not.toBeNull();
    expect(problemaMensaje("x".repeat(MAX_CARACTERES_MENSAJE + 1))).not.toBeNull();
    expect(problemaMensaje("Instálate 7-Zip")).toBeNull();
  });

  it("convierte en enlace solo http(s) y deja fuera el punto final", () => {
    expect(trozosConEnlaces("Bájalo de https://7-zip.org. Gracias")).toEqual([
      { texto: "Bájalo de " },
      { texto: "https://7-zip.org", enlace: "https://7-zip.org" },
      { texto: ". Gracias" },
    ]);
    expect(trozosConEnlaces("javascript:alert(1)")).toEqual([{ texto: "javascript:alert(1)" }]);
  });

  it("separa los días como WhatsApp, en hora de España", () => {
    const ahora = new Date("2026-11-09T12:00:00Z");
    expect(textoDia(new Date("2026-11-09T08:00:00Z"), ahora)).toBe("Hoy");
    expect(textoDia(new Date("2026-11-08T22:30:00Z"), ahora)).toBe("Ayer");
    expect(textoDia(new Date("2026-11-03T10:00:00Z"), ahora)).toMatch(/^Martes, 3 de noviembre$/);
    expect(textoDia(new Date("2025-11-03T10:00:00Z"), ahora)).toMatch(/2025/);
  });

  it("calcula el recordatorio a partir de la entrega", () => {
    const entrega = new Date("2026-11-10T17:00:00Z");
    expect(calcularRecordatorio("", entrega, null)).toBeNull();
    expect(calcularRecordatorio("1h", entrega, null)).toEqual(new Date("2026-11-10T16:00:00Z"));
    expect(calcularRecordatorio("4h", entrega, null)).toEqual(new Date("2026-11-10T13:00:00Z"));
    expect(calcularRecordatorio("10h", entrega, null)).toEqual(new Date("2026-11-10T07:00:00Z"));
    expect(calcularRecordatorio("entrega", entrega, null)).toEqual(entrega);
    expect(typeof calcularRecordatorio("15m", null, null)).toBe("string"); // falta la entrega
    const otra = new Date("2026-11-10T08:00:00Z");
    expect(calcularRecordatorio("otra", null, otra)).toEqual(otra);
    expect(typeof calcularRecordatorio("inventado", entrega, null)).toBe("string");
  });

  it("comprueba los datos de una tarea que llegan del navegador", () => {
    expect(
      leerDatosTarea({
        prioridad: "ALTA",
        entrega: "2026-11-10T17:00:00.000Z",
        recordatorio: "1d",
      }),
    ).toEqual({
      prioridad: "ALTA",
      entregaEn: new Date("2026-11-10T17:00:00Z"),
      responsableId: null,
      recordarEn: new Date("2026-11-09T17:00:00Z"),
    });
    expect(leerDatosTarea({ prioridad: "URGENTISIMA", responsableId: "../x" })).toEqual({
      prioridad: null,
      entregaEn: null,
      responsableId: null,
      recordarEn: null,
    });
    expect(typeof leerDatosTarea({ entrega: "mañana" })).toBe("string");
    expect(typeof leerDatosTarea({ entrega: "1800-01-01T00:00:00Z" })).toBe("string");
  });

  it("una tarea vence si pasa la entrega sin estar hecha", () => {
    const ahora = new Date("2026-11-10T12:00:00Z");
    const ayer = new Date("2026-11-09T12:00:00Z");
    expect(vencida(ayer, "PENDIENTE", ahora)).toBe(true);
    expect(vencida(ayer, "HECHA", ahora)).toBe(false);
    expect(vencida(null, "PENDIENTE", ahora)).toBe(false);
  });
});
