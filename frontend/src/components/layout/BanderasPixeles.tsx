"use client";

import { useEffect, useRef } from "react";

/**
 * BANDERAS EN PÍXELES (al final del pie de página): la de Europa, la Senyera valenciana (en medio)
 * y la de España, cada una en su mástil. Al llegar abajo del todo, los cuadraditos caen y las forman
 * de izquierda a derecha; después ondean suavemente (más cuanto más lejos del mástil) y se
 * encienden al pasar el ratón. Decorativo (aria-hidden). Con «reducir movimiento» salen ya
 * formadas y quietas.
 */

const ALTO = 27; // filas de cada bandera (la Senyera tiene 9 franjas de 3)
const ANCHO = 40; // columnas (proporción 2:3, aprox.)
const SEPARACION = 9; // columnas entre una bandera y la siguiente
const MASTIL_EXTRA = 10; // lo que baja el mástil por debajo de la bandera

const AZUL_UE = "#003399";
const AMARILLO_UE = "#ffcc00";
const ROJO_ES = "#c60b1e";
const AMARILLO_ES = "#ffc400";
const ROJO_VAL = "#da121a";
const AMARILLO_VAL = "#fcdd09";
const AZUL_VAL = "#2266cc"; // azul claro, como pide la descripción oficial
const MASTIL = "#a1a1a1";

type Pintor = (x: number, y: number) => string | null;

/** Europa: azul con doce estrellas en círculo (cada estrella, una crucecita de 5 píxeles) */
function europa(): Pintor {
  const estrellas = new Set<string>();
  const cx = ANCHO / 2 - 0.5;
  const cy = ALTO / 2 - 0.5;
  const radio = ALTO / 3;
  for (let i = 0; i < 12; i++) {
    const angulo = (i / 12) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(angulo) * radio);
    const y = Math.round(cy + Math.sin(angulo) * radio);
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      estrellas.add(`${x + dx},${y + dy}`);
    }
  }
  return (x, y) => (estrellas.has(`${x},${y}`) ? AMARILLO_UE : AZUL_UE);
}

/** España: rojo, amarillo (el doble de ancho) y rojo */
function espana(): Pintor {
  const franja = Math.round(ALTO / 4);
  return (_x, y) => (y < franja || y >= ALTO - franja ? ROJO_ES : AMARILLO_ES);
}

/**
 * La Senyera: cuatro barras rojas sobre amarillo (9 franjas iguales, amarillo arriba y abajo) y una
 * franja azul lisa junto al mástil (1/5 del largo). Sin corona ni dibujos (decisión del usuario).
 */
function valencia(): Pintor {
  const anchoAzul = 8; // 1/5 de 40
  return (x, y) => {
    if (x < anchoAzul) return AZUL_VAL;
    return Math.floor(y / 3) % 2 === 0 ? AMARILLO_VAL : ROJO_VAL;
  };
}

export function BanderasPixeles() {
  const lienzo = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Todas las celdas: mástil (columna 0 de cada bandera) y tela
    // La Senyera, en medio
    const banderas = [europa(), valencia(), espana()];
    const anchoTotal = banderas.length * (ANCHO + 1) + SEPARACION * (banderas.length - 1);
    const altoTotal = ALTO + MASTIL_EXTRA + 1;
    type Celda = { x: number; y: number; color: string; tela: number; inicio: number };
    const celdas: Celda[] = [];
    let semilla = 5;
    const azar = () => {
      semilla = (semilla * 16807) % 2147483647;
      return (semilla - 1) / 2147483646;
    };
    banderas.forEach((pintar, b) => {
      const origen = b * (ANCHO + 1 + SEPARACION);
      // Mástil: desde un poco por encima de la tela hasta el suelo
      for (let y = 0; y < altoTotal; y++) {
        celdas.push({
          x: origen,
          y,
          color: MASTIL,
          tela: 0,
          inicio: b * 700 + (altoTotal - y) * 18,
        });
      }
      for (let y = 0; y < ALTO; y++) {
        for (let x = 0; x < ANCHO; x++) {
          const color = pintar(x, y);
          if (!color) continue;
          const gx = origen + 1 + x;
          celdas.push({
            x: gx,
            y: y + 1,
            color,
            tela: x + 1, // distancia al mástil: cuanto más lejos, más ondea
            inicio: b * 700 + 300 + x * 26 + azar() * 380,
          });
        }
      }
    });

    let lado = 4;
    let origenX = 0;
    let ancho = 0;
    let alto = 0;
    function preparar() {
      const caja = canvas!.getBoundingClientRect();
      ancho = caja.width;
      lado = Math.max(2, Math.min(5, Math.floor(ancho / (anchoTotal + 4))));
      alto = (altoTotal + 3) * lado; // +3: sitio para que la tela ondee sin cortarse
      canvas!.style.height = `${alto}px`;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(ancho * dpr);
      canvas!.height = Math.round(alto * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      origenX = Math.round((ancho - anchoTotal * lado) / 2);
    }

    const raton = { x: -999, y: -999 };
    let empezo = quieto ? -1e9 : 0; // 0 = todavía no se ha visto
    const CAIDA = 650;

    function pintar(ahora: number) {
      ctx!.clearRect(0, 0, ancho, alto);
      const t = empezo ? ahora - empezo : -1;
      const segundos = ahora / 1000;
      // Dos pasadas: primero los fondos negros de la tela (tapan el paisaje de detrás) y después
      // los colores; así ningún fondo pisa el color de una celda vecina
      for (const pasada of ["fondo", "color"] as const) {
        for (const c of celdas) {
          if (pasada === "fondo" && !c.tela) continue;
          const local = t - c.inicio;
          if (local < 0) continue;
          const avance = Math.min(1, local / CAIDA);
          const caida = (1 - avance) ** 3 * 36;
          // Ondear: una onda que avanza desde el mástil, más amplia hacia el extremo
          const onda =
            quieto || !c.tela
              ? 0
              : Math.sin(segundos * 2.4 - c.tela * 0.28) * (c.tela / ANCHO) * 1.6;
          const px = origenX + c.x * lado;
          const py = (c.y + 1.5 + onda) * lado - caida;
          ctx!.globalAlpha = avance;
          if (pasada === "fondo") {
            ctx!.fillStyle = "#0b0b0b";
            ctx!.fillRect(px - 0.5, py - 0.5, lado + 1, lado + 1);
            continue;
          }
          const cerca = c.tela > 0 && Math.hypot(px - raton.x, py - raton.y) < lado * 5;
          ctx!.fillStyle = cerca ? "#ffffff" : c.color;
          const tam = lado > 3 ? lado - 1 : lado;
          ctx!.fillRect(px, py, tam, tam);
        }
      }
      ctx!.globalAlpha = 1;
    }

    preparar();
    pintar(performance.now());
    let fotograma = 0;
    let visible = false;
    const bucle = (ahora: number) => {
      pintar(ahora);
      fotograma = visible && !quieto ? requestAnimationFrame(bucle) : 0;
    };
    const observador = new IntersectionObserver(
      ([entrada]) => {
        visible = entrada.isIntersecting;
        if (visible && !empezo) empezo = performance.now();
        if (visible && !fotograma && !quieto) fotograma = requestAnimationFrame(bucle);
      },
      { threshold: 0.3 },
    );
    observador.observe(canvas);
    const redimensionar = new ResizeObserver(() => {
      preparar();
      pintar(performance.now());
    });
    redimensionar.observe(canvas);

    const alMover = (e: PointerEvent) => {
      const caja = canvas.getBoundingClientRect();
      raton.x = e.clientX - caja.left;
      raton.y = e.clientY - caja.top;
    };
    const alSalir = () => {
      raton.x = raton.y = -999;
    };
    canvas.addEventListener("pointermove", alMover);
    canvas.addEventListener("pointerleave", alSalir);

    return () => {
      cancelAnimationFrame(fotograma);
      observador.disconnect();
      redimensionar.disconnect();
      canvas.removeEventListener("pointermove", alMover);
      canvas.removeEventListener("pointerleave", alSalir);
    };
  }, []);

  return <canvas ref={lienzo} aria-hidden="true" className="block w-full" />;
}
