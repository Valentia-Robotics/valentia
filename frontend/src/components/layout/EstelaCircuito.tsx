"use client";

import { useEffect, useRef } from "react";
import { crearPequena, pintarPieza, type Pieza } from "./piezasEstela";

/**
 * ESTELA DE CIRCUITO EN TODA LA WEB PÚBLICA (Jesse, 12-11-2026: «la animación del chip que pasas el
 * ratón y salen cables, que la expandas a la web, dejando el final como está»).
 * Es la misma estela de CampoPixeles (pista a 90°/45° sobre una rejilla, que se apaga sola y acaba
 * en un pad), pero en un lienzo fijo encima de toda la página, sin recibir clics.
 *  - Color según el fondo que hay debajo del ratón: verde de placa sobre claro, cobre sobre oscuro.
 *  - No se pinta donde ya hay un CampoPixeles (titular, cabeceras, bloque final: tienen la suya) ni
 *    en el pie de página: el final de la web se queda como estaba.
 *  - Solo con ratón (en el móvil no hay cursor) y nunca con «reducir movimiento».
 *  - Por el camino se quedan, MUY de vez en cuando, piezas mini (resistencias, diodos, condensadores:
 *    piezasEstela.ts); sin chips grandes (esos son los fijos de ChipsFijos). Tampoco se dibuja
 *    encima de enlaces, botones ni campos.
 *  - Solo dibuja mientras queda algo vivo: sin mover el ratón no gasta nada.
 */
const CELDA = 12;
const CLICABLE = "a, button, input, select, textarea, summary, label, [role=button], [role=tab]";
const VERDE = "#155c39";
const COBRE = "#d8a743";

interface Punto {
  /** Celda de la rejilla, en coordenadas de la PÁGINA (así la estela se va con el scroll) */
  x: number;
  y: number;
  vida: number;
  color: string;
}

/** ¿Es oscuro este color CSS («rgb(12, 58, 36)»)? */
function esOscuro(color: string): boolean {
  const n = color.match(/[\d.]+/g)?.map(Number);
  if (!n || n.length < 3) return false;
  return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2] < 110;
}

/** Color de la estela según lo que hay debajo; null = aquí no se pinta */
function colorEn(elemento: Element | null): string | null {
  // Encima de lo que se pulsa no se dibuja nada: la web se lee limpia
  if (elemento?.closest(CLICABLE)) return null;
  let el: Element | null = elemento;
  while (el && el !== document.body) {
    if (el.tagName === "FOOTER") return null;
    if (el.querySelector(":scope > canvas[data-campo-pixeles]")) return null;
    const estilo = getComputedStyle(el);
    const fondo = estilo.backgroundColor;
    const transparente = fondo === "transparent" || /rgba\(.*,\s*0\)$/.test(fondo);
    if (!transparente) return esOscuro(fondo) ? COBRE : VERDE;
    if (estilo.backgroundImage !== "none") return COBRE; // degradados de placa: siempre oscuros
    el = el.parentElement;
  }
  return VERDE;
}

export function EstelaCircuito() {
  const lienzo = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const estela: Punto[] = [];
    const piezas: Pieza[] = [];
    let pasosSinPieza = 0;
    let fotograma = 0;

    function ajustar() {
      const ppp = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(window.innerWidth * ppp);
      canvas!.height = Math.round(window.innerHeight * ppp);
      ctx!.setTransform(ppp, 0, 0, ppp, 0, 0);
    }

    function pintar() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const dx = window.scrollX;
      const dy = window.scrollY;
      const c2 = CELDA / 2;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.lineWidth = 3;
      for (let i = 1; i < estela.length; i++) {
        const a = estela[i - 1];
        const b = estela[i];
        ctx!.globalAlpha = Math.max(0, Math.min(a.vida, b.vida)) * 0.8;
        ctx!.strokeStyle = b.color;
        ctx!.beginPath();
        ctx!.moveTo(a.x * CELDA + c2 - dx, a.y * CELDA + c2 - dy);
        ctx!.lineTo(b.x * CELDA + c2 - dx, b.y * CELDA + c2 - dy);
        ctx!.stroke();
      }
      const cabeza = estela[estela.length - 1];
      if (cabeza) {
        // El pad del final: un cuadradito como los de la placa
        ctx!.globalAlpha = Math.max(0, cabeza.vida);
        ctx!.fillStyle = cabeza.color;
        ctx!.fillRect(cabeza.x * CELDA + 2 - dx, cabeza.y * CELDA + 2 - dy, CELDA - 4, CELDA - 4);
      }
      ctx!.globalAlpha = 1;
      for (const p of estela) p.vida -= 0.02;
      while (estela.length && estela[0].vida <= 0) estela.shift();

      // Piezas pequeñas que se quedan por el camino: se desvanecen despacio
      const ahora = performance.now() / 1000;
      for (const p of piezas) {
        pintarPieza(ctx!, p, dx, dy, ahora);
        p.edad++;
        p.vida -= 0.012;
      }
      for (let i = piezas.length - 1; i >= 0; i--) if (piezas[i].vida <= 0) piezas.splice(i, 1);
    }

    const bucle = () => {
      pintar();
      fotograma = estela.length || piezas.length ? requestAnimationFrame(bucle) : 0;
      if (!fotograma) ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
    const arrancar = () => {
      if (!fotograma) fotograma = requestAnimationFrame(bucle);
    };

    const alMover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const color = colorEn(e.target instanceof Element ? e.target : null);
      if (!color) {
        // Sale de la zona: la estela que había se apaga sola, pero no sigue
        if (estela.length) estela[estela.length - 1].vida = Math.min(estela.at(-1)!.vida, 0.6);
        return;
      }
      const x = Math.floor((e.clientX + window.scrollX) / CELDA);
      const y = Math.floor((e.clientY + window.scrollY) / CELDA);
      const ultimo = estela[estela.length - 1];
      if (ultimo && ultimo.x === x && ultimo.y === y) return;
      // Un salto grande (entra desde otra zona): empieza una pista nueva en vez de cruzar la página
      if (ultimo && Math.max(Math.abs(x - ultimo.x), Math.abs(y - ultimo.y)) > 12)
        estela.length = 0;
      const previo = estela[estela.length - 1];
      if (previo) {
        const ddx = x - previo.x;
        const ddy = y - previo.y;
        const diagonal = Math.min(Math.abs(ddx), Math.abs(ddy));
        if (diagonal && Math.abs(ddx) !== Math.abs(ddy)) {
          // Esquina: primero el tramo a 45°, luego el recto (como una pista de verdad)
          estela.push({
            x: previo.x + Math.sign(ddx) * diagonal,
            y: previo.y + Math.sign(ddy) * diagonal,
            vida: 1,
            color,
          });
        }
      }
      estela.push({ x, y, vida: 1, color });
      // De vez en cuando (y pocas a la vez), una resistencia, un diodo o un condensador mini
      if (++pasosSinPieza > 20 && previo && piezas.length < 5 && Math.random() < 0.3) {
        pasosSinPieza = 0;
        const vertical = Math.abs(y - previo.y) > Math.abs(x - previo.x);
        piezas.push(crearPequena(x * CELDA + CELDA / 2, y * CELDA + CELDA / 2, color, vertical));
      }
      if (estela.length > 80) estela.splice(0, estela.length - 80);
      arrancar();
    };

    ajustar();
    window.addEventListener("resize", ajustar);
    document.addEventListener("pointermove", alMover, { passive: true });
    return () => {
      cancelAnimationFrame(fotograma);
      window.removeEventListener("resize", ajustar);
      document.removeEventListener("pointermove", alMover);
    };
  }, []);

  return (
    <canvas
      ref={lienzo}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 size-full print:hidden"
    />
  );
}
