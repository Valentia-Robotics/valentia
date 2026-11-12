"use client";

import { useEffect, useRef } from "react";

/**
 * PAISAJE DE FONDO DEL PIE: un paisaje de noche hecho con píxeles y medio
 * transparente, para que el pie no sea un bloque negro plano. De arriba abajo: estrellas que
 * parpadean, la luna, montañas al fondo, el mar con reflejos y la tierra de abajo.
 * Se funde con el negro hacia arriba (máscara), así los enlaces se leen igual.
 * Decorativo (aria-hidden). Se para fuera de pantalla; con «reducir movimiento», quieto.
 */
export function PaisajePixeles() {
  const lienzo = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ancho = 0;
    let alto = 0;
    let celda = 8;
    let estrellas: { x: number; y: number; fase: number }[] = [];
    let reflejos: { x: number; y: number; fase: number }[] = [];

    /** Altura (en celdas) de una silueta de montañas en la columna x: suma de ondas */
    const silueta = (x: number, base: number, amplitud: number, semilla: number) =>
      Math.round(
        base +
          amplitud *
            (0.55 * Math.sin(x * 0.045 + semilla) +
              0.3 * Math.sin(x * 0.11 + semilla * 2.3) +
              0.15 * Math.sin(x * 0.27 + semilla * 4.1)),
      );

    let columnas = 0;
    let filas = 0;
    function preparar() {
      const caja = canvas!.getBoundingClientRect();
      ancho = caja.width;
      alto = caja.height;
      celda = ancho < 640 ? 6 : 8;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(ancho * dpr);
      canvas!.height = Math.round(alto * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      columnas = Math.ceil(ancho / celda);
      filas = Math.ceil(alto / celda);
      let semilla = 3;
      const azar = () => {
        semilla = (semilla * 16807) % 2147483647;
        return (semilla - 1) / 2147483646;
      };
      estrellas = Array.from({ length: Math.round(columnas * 0.9) }, () => ({
        x: Math.floor(azar() * columnas),
        y: Math.floor(azar() * filas * 0.55),
        fase: azar() * Math.PI * 2,
      }));
      reflejos = Array.from({ length: Math.round(columnas * 0.5) }, () => ({
        x: Math.floor(azar() * columnas),
        y: 0, // se coloca en el mar al pintar
        fase: azar() * Math.PI * 2,
      }));
    }

    const cuadro = (x: number, y: number, color: string, alfa: number) => {
      ctx!.globalAlpha = alfa;
      ctx!.fillStyle = color;
      ctx!.fillRect(x * celda, y * celda, celda - 1, celda - 1);
    };

    function pintar(ahora: number) {
      const t = quieto ? 0 : ahora / 1000;
      ctx!.clearRect(0, 0, ancho, alto);

      // Niveles (en filas desde arriba)
      // La tierra ocupa los últimos 40 px (ahí va el «Hecho en València»); encima, el mar
      const tierra = filas - Math.ceil(40 / celda);
      const mar = tierra - Math.max(4, Math.round(filas * 0.12));

      // Estrellas
      for (const e of estrellas) {
        const brillo = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + e.fase));
        cuadro(e.x, e.y, "#ffffff", brillo);
      }

      // La luna llena (un círculo de píxeles; el borde, algo más tenue)
      const lx = Math.round(columnas * 0.82);
      const ly = Math.round(filas * 0.3);
      const r = Math.max(4, Math.round(filas * 0.11));
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y > r * r) continue;
          const borde = x * x + y * y > (r - 1) * (r - 1);
          cuadro(lx + x, ly + y, "#ffc21a", borde ? 0.45 : 0.8);
        }
      }

      // Montañas: dos capas, la de atrás más oscura
      for (let x = 0; x < columnas; x++) {
        const lejos = silueta(x, mar - filas * 0.3, filas * 0.14, 1.7);
        for (let y = Math.max(0, lejos); y < mar; y++) cuadro(x, y, "#1c2a7a", 0.7);
        const cerca = silueta(x, mar - filas * 0.14, filas * 0.08, 4.2);
        for (let y = Math.max(0, cerca); y < mar; y++) cuadro(x, y, "#2d4bff", 0.45);
      }

      // El mar: franjas de azul y reflejos de la luna que brillan y se mueven
      for (let y = mar; y < tierra; y++) {
        for (let x = 0; x < columnas; x++) {
          cuadro(x, y, "#13205e", 0.6);
        }
      }
      for (const reflejo of reflejos) {
        const fila = mar + 1 + Math.floor(((reflejo.fase * 7) % 1) * Math.max(1, tierra - mar - 1));
        const desplazado = Math.round(reflejo.x + Math.sin(t * 0.6 + reflejo.fase) * 2);
        const cercaLuna = Math.abs(desplazado - lx) < columnas * 0.12;
        const brillo =
          (0.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2 + reflejo.fase))) * (cercaLuna ? 1 : 0.5);
        cuadro(desplazado, fila, cercaLuna ? "#ffc21a" : "#7a8cff", brillo);
      }

      // La tierra, abajo del todo
      for (let y = tierra; y < filas; y++) {
        for (let x = 0; x < columnas; x++) cuadro(x, y, "#0f1638", 0.9);
      }
      ctx!.globalAlpha = 1;
    }

    preparar();
    pintar(performance.now());
    let fotograma = 0;
    let visible = false;
    let ultimo = 0;
    const bucle = (ahora: number) => {
      // Basta con unas 15 imágenes por segundo: el paisaje se mueve despacio
      if (ahora - ultimo > 66) {
        pintar(ahora);
        ultimo = ahora;
      }
      fotograma = visible && !quieto ? requestAnimationFrame(bucle) : 0;
    };
    const observador = new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting;
      if (visible && !fotograma && !quieto) fotograma = requestAnimationFrame(bucle);
    });
    observador.observe(canvas);
    const redimensionar = new ResizeObserver(() => {
      preparar();
      pintar(performance.now());
    });
    redimensionar.observe(canvas);

    return () => {
      cancelAnimationFrame(fotograma);
      observador.disconnect();
      redimensionar.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={lienzo}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
      // Se funde con el negro hacia arriba: los enlaces del pie quedan sobre negro limpio
      style={{ maskImage: "linear-gradient(to bottom, transparent 0%, #000 55%)" }}
    />
  );
}
