"use client";

import { useEffect, useRef } from "react";

/**
 * CAMPO DE PÍXELES: el «dibujo vivo» de los campos de color de la portada.
 * Un cable grueso que cruza la esquina, una mancha tramada (como una placa vista muy de cerca) y
 * píxeles sueltos que parpadean y se van haciendo más raros hacia arriba. Al mover el ratón por
 * encima, los píxeles se encienden detrás del cursor y se apagan solos.
 *
 * Es un <canvas> decorativo (aria-hidden): no lleva texto. Se para cuando no se ve y, con
 * «reducir movimiento», se dibuja una vez y se queda quieto.
 *
 *   variante → "portada" (sobre azul claro: cable arriba a la derecha) o "final" (sobre negro:
 *              cable abajo a la izquierda)
 */
const PALETAS = {
  // [principal, secundario, detalle]: azul circuito, blanco y el amarillo de las ruedas
  portada: ["#2d4bff", "#ffffff", "#ffc21a"],
  final: ["#2d4bff", "#7a8cff", "#ffc21a"],
} as const;

export function CampoPixeles({
  variante = "portada",
  className,
}: {
  variante?: "portada" | "final";
  className?: string;
}) {
  const lienzo = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const [principal, secundario, detalle] = PALETAS[variante];

    // Números «al azar» pero siempre iguales: el dibujo no cambia entre visitas
    let semilla = variante === "portada" ? 7 : 19;
    const azar = () => {
      semilla = (semilla * 16807) % 2147483647;
      return (semilla - 1) / 2147483646;
    };

    let ancho = 0;
    let alto = 0;
    let celda = 12;
    let estrecho = false;
    type Pixel = {
      x: number;
      y: number;
      color: string;
      fase: number;
      velocidad: number;
      base: number;
    };
    let sueltos: Pixel[] = [];
    let mancha: { x: number; y: number; tramado: boolean }[] = [];
    const rastro = new Map<string, { x: number; y: number; vida: number; color: string }>();

    function preparar() {
      const caja = canvas!.getBoundingClientRect();
      ancho = caja.width;
      alto = caja.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(ancho * dpr);
      canvas!.height = Math.round(alto * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      celda = ancho < 640 ? 9 : 12;
      semilla = variante === "portada" ? 7 : 19;

      const columnas = Math.ceil(ancho / celda);
      const filas = Math.ceil(alto / celda);

      // La mancha tramada: un círculo deformado, relleno a cuadros
      mancha = [];
      // En el móvil el texto ocupa todo el ancho: la mancha baja a la esquina de abajo
      estrecho = ancho < 640;
      const cx = (variante === "portada" ? (estrecho ? 0.92 : 0.86) : 0.14) * columnas;
      const cy =
        (variante === "portada" ? (estrecho ? 0.93 : 0.42) : estrecho ? 0.92 : 0.55) * filas;
      const radio = Math.max(5, Math.min(columnas, filas) * (estrecho ? 0.24 : 0.26));
      for (let f = Math.floor(cy - radio * 1.4); f < cy + radio * 1.4; f++) {
        for (let c = Math.floor(cx - radio * 1.4); c < cx + radio * 1.4; c++) {
          const angulo = Math.atan2(f - cy, c - cx);
          const borde = radio * (1 + 0.28 * Math.sin(angulo * 3 + 1) + 0.12 * Math.sin(angulo * 7));
          const distancia = Math.hypot(c - cx, (f - cy) * 1.15);
          if (distancia < borde && azar() > (distancia / borde) ** 6 * 0.9) {
            mancha.push({ x: c, y: f, tramado: (c + f) % 2 === 0 && distancia < borde * 0.85 });
          }
        }
      }

      // Píxeles sueltos: muchos abajo, casi ninguno arriba
      sueltos = [];
      const cuantos = Math.round((columnas * filas) / (ancho < 640 ? 34 : 26));
      for (let i = 0; i < cuantos; i++) {
        const y = Math.floor(filas * (1 - Math.pow(azar(), 2.4)));
        const x = Math.floor(azar() * columnas);
        // Dejar libre la zona del texto (izquierda arriba en la portada, centro en el final)
        const libre = estrecho
          ? y < filas * 0.86
          : variante === "portada"
            ? x < columnas * 0.64 && y < filas * 0.86
            : Math.abs(x - columnas / 2) < columnas * 0.32 && y < filas * 0.8;
        if (libre) continue;
        const r = azar();
        sueltos.push({
          x,
          y,
          color: r < 0.55 ? secundario : r < 0.88 ? principal : detalle,
          fase: azar() * Math.PI * 2,
          velocidad: 0.4 + azar() * 1.4,
          base: 0.35 + azar() * 0.65,
        });
      }
    }

    let desplazamiento = 0; // un poco de paralaje con el scroll
    function pintar(tiempo: number) {
      const t = tiempo / 1000;
      ctx!.clearRect(0, 0, ancho, alto);
      const lado = celda - 2;

      // El cable: un trazo grueso de puntas redondas
      ctx!.save();
      ctx!.translate(0, desplazamiento * -0.15);
      ctx!.strokeStyle = principal;
      ctx!.lineCap = "round";
      ctx!.lineWidth = estrecho ? 26 : Math.max(36, ancho * 0.045);
      ctx!.beginPath();
      if (variante === "portada" && estrecho) {
        // Móvil: el cable baja por el borde derecho, lejos del texto
        ctx!.moveTo(ancho * 1.02, alto * 0.62);
        ctx!.lineTo(ancho * 0.9, alto * 0.86);
      } else if (variante === "portada") {
        ctx!.moveTo(ancho * 0.66, -alto * 0.12);
        ctx!.lineTo(ancho * 0.83, alto * 0.24);
      } else {
        ctx!.moveTo(-ancho * 0.02, alto * 0.95);
        ctx!.lineTo(ancho * 0.12, alto * 0.62);
      }
      ctx!.stroke();
      ctx!.restore();

      // La mancha tramada: celdas del color principal con un punto claro en las de cuadro
      const respira = quieto ? 0 : Math.sin(t * 0.8) * 1.5;
      ctx!.save();
      ctx!.translate(respira, desplazamiento * -0.08 + respira);
      for (const p of mancha) {
        ctx!.fillStyle = principal;
        ctx!.fillRect(p.x * celda, p.y * celda, celda, celda);
        if (p.tramado) {
          ctx!.fillStyle = secundario;
          ctx!.fillRect(p.x * celda + celda / 2 - 2, p.y * celda + celda / 2 - 2, 4, 4);
        }
      }
      ctx!.restore();

      // Los sueltos parpadean despacio (algunos se apagan del todo un momento)
      for (const p of sueltos) {
        const brillo = quieto
          ? p.base
          : Math.max(0, p.base + 0.45 * Math.sin(t * p.velocidad + p.fase));
        if (brillo < 0.08) continue;
        ctx!.globalAlpha = Math.min(1, brillo);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(p.x * celda + 1, p.y * celda + 1, lado, lado);
      }

      // El rastro del ratón
      for (const [clave, p] of rastro) {
        ctx!.globalAlpha = Math.max(0, p.vida);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(p.x * celda + 1, p.y * celda + 1, lado, lado);
        p.vida -= 0.025;
        if (p.vida <= 0) rastro.delete(clave);
      }
      ctx!.globalAlpha = 1;
    }

    preparar();
    let fotograma = 0;
    let visible = true;
    const bucle = (tiempo: number) => {
      pintar(tiempo);
      fotograma = visible && !quieto ? requestAnimationFrame(bucle) : 0;
    };
    const arrancar = () => {
      if (!fotograma && visible && !quieto) fotograma = requestAnimationFrame(bucle);
    };
    pintar(0);
    arrancar();

    const observador = new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting;
      if (visible) arrancar();
    });
    observador.observe(canvas);

    const redimensionar = new ResizeObserver(() => {
      preparar();
      pintar(performance.now());
    });
    redimensionar.observe(canvas);

    // El ratón se escucha en la sección entera (el lienzo no recibe clics: el texto sigue usable)
    const zona = canvas.parentElement;
    const alMover = (e: PointerEvent) => {
      if (quieto || e.pointerType !== "mouse") return;
      const caja = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - caja.left) / celda);
      const y = Math.floor((e.clientY - caja.top) / celda);
      for (let i = 0; i < 3; i++) {
        const px = x + Math.round((azar() - 0.5) * 4);
        const py = y + Math.round((azar() - 0.5) * 4);
        const r = azar();
        rastro.set(`${px},${py}`, {
          x: px,
          y: py,
          vida: 1,
          color: r < 0.5 ? principal : r < 0.85 ? secundario : detalle,
        });
      }
      arrancar();
    };
    const alScroll = () => {
      desplazamiento = Math.min(window.scrollY, 1200);
    };
    zona?.addEventListener("pointermove", alMover);
    window.addEventListener("scroll", alScroll, { passive: true });

    return () => {
      cancelAnimationFrame(fotograma);
      observador.disconnect();
      redimensionar.disconnect();
      zona?.removeEventListener("pointermove", alMover);
      window.removeEventListener("scroll", alScroll);
    };
  }, [variante]);

  return (
    <canvas
      ref={lienzo}
      aria-hidden="true"
      className={className ?? "pointer-events-none absolute inset-0 size-full"}
    />
  );
}
