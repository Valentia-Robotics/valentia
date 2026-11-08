/**
 * Pruebas del protocolo del mando (npm test, con el probador de Node).
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { leerMensaje, mezclar, orden, partirLineas } from "./protocolo.ts";

test("joystick hacia delante: las dos ruedas igual", () => {
  assert.deepEqual(mezclar(0, 1, 80), { izq: 80, der: 80 });
});

test("joystick a la derecha: gira sobre sí mismo", () => {
  assert.deepEqual(mezclar(1, 0, 100), { izq: 100, der: -100 });
});

test("en diagonal se reduce sin pasarse del tope", () => {
  const { izq, der } = mezclar(1, 1, 100);
  assert.equal(izq, 100);
  assert.equal(der, 0);
});

test("en el centro, quieto", () => {
  assert.deepEqual(mezclar(0, 0, 100), { izq: 0, der: 0 });
});

test("las órdenes no se pasan de ±100", () => {
  assert.equal(orden.mover(150, -300), "M 100 -100");
});

test("lee la distancia y el saludo del coche", () => {
  assert.deepEqual(leerMensaje("D 23"), { tipo: "distancia", cm: 23 });
  assert.deepEqual(leerMensaje("D -1"), { tipo: "distancia", cm: null });
  assert.deepEqual(leerMensaje("H Valentia-Coche-A1B2 1.0"), {
    tipo: "hola",
    nombre: "Valentia-Coche-A1B2",
    version: "1.0",
  });
  assert.equal(leerMensaje("X basura"), null);
});

test("junta los trozos que llegan partidos", () => {
  const a = partirLineas("", "D 2");
  assert.deepEqual(a, { lineas: [], resto: "D 2" });
  const b = partirLineas(a.resto, "3\nO linea\nD");
  assert.deepEqual(b, { lineas: ["D 23", "O linea"], resto: "D" });
});
