/**
 * Pruebas del coche simulado (npm test).
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { CocheSimulado, puntoDeLaLinea } from "./cocheSimulado.ts";
import { leerOrden } from "./protocolo.ts";

/** Simula segundos mandando una orden cada 150 ms, como el mando */
function correr(coche: CocheSimulado, segundos: number, linea: string) {
  for (let t = 0; t < segundos * 1000; t += 30) {
    if (t % 150 === 0) coche.recibir(linea);
    coche.avanzar(0.03);
  }
}

test("lee las órdenes del mando", () => {
  assert.deepEqual(leerOrden("M 50 -20"), { tipo: "mover", izq: 50, der: -20 });
  assert.deepEqual(leerOrden("M 300 0"), { tipo: "mover", izq: 100, der: 0 });
  assert.deepEqual(leerOrden("O linea"), { tipo: "modo", modo: "linea" });
  assert.equal(leerOrden("O volar"), null);
  assert.equal(leerOrden("M uno dos"), null);
});

test("hacia delante avanza en línea recta", () => {
  const coche = new CocheSimulado();
  const x0 = coche.x;
  correr(coche, 1, "M 50 50");
  assert.ok(coche.x > x0 + 25, `avanzó ${coche.x - x0} cm`);
  assert.ok(Math.abs(coche.angulo) < 1e-9);
});

test("rueda izquierda más rápida: gira a la derecha", () => {
  const coche = new CocheSimulado();
  correr(coche, 0.5, "M 60 -60");
  assert.ok(coche.angulo > 0);
});

test("sin mensajes durante medio segundo se para solo", () => {
  const coche = new CocheSimulado();
  coche.recibir("M 80 80");
  for (let i = 0; i < 30; i++) coche.avanzar(0.03);
  assert.equal(coche.izq, 0);
  assert.equal(coche.der, 0);
});

test("no atraviesa las paredes", () => {
  const coche = new CocheSimulado();
  correr(coche, 10, "M 100 100");
  assert.ok(coche.x < 300 - 10);
  assert.ok(coche.chocado);
  assert.ok((coche.distancia() ?? 99) < 3);
});

test("en modo línea se queda cerca del circuito", () => {
  const coche = new CocheSimulado();
  coche.recibir("O linea");
  let peor = 0;
  for (let t = 0; t < 20000; t += 30) {
    if (t % 150 === 0) coche.recibir("L");
    coche.avanzar(0.03);
    const { px, py } = puntoDeLaLinea(coche.x, coche.y);
    if (t > 2000) peor = Math.max(peor, Math.hypot(px - coche.x, py - coche.y));
  }
  assert.ok(peor < 12, `se alejó ${peor.toFixed(1)} cm`);
  assert.ok(!coche.chocado);
});

test("en modo esquivar no se queda pegado a nada", () => {
  const coche = new CocheSimulado();
  coche.recibir("O obstaculos");
  let chocado = 0;
  for (let t = 0; t < 30000; t += 30) {
    if (t % 150 === 0) coche.recibir("L");
    coche.avanzar(0.03);
    if (coche.chocado) chocado++;
  }
  assert.ok(chocado < 20, `chocó ${chocado} veces`);
});
