/**
 * Texturas del robot 3D de la portada, dibujadas con un <canvas> 2D (sin imágenes que descargar):
 * la serigrafía de las placas, la rejilla de los ultrasonidos, los agujeros de la protoboard…
 * Solo lo usa escenaRobot.ts / modeloCoche.ts (se cargan con import(), después de pintar la página).
 */
import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from "three";

type Dibujo = (ctx: CanvasRenderingContext2D, ancho: number, alto: number) => void;

function textura(ancho: number, alto: number, dibujar: Dibujo) {
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  dibujar(lienzo.getContext("2d")!, ancho, alto);
  const t = new CanvasTexture(lienzo);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Pistas de cobre bajo la máscara de la placa (líneas un poco más claras) */
function pistas(ctx: CanvasRenderingContext2D, ancho: number, alto: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  let semilla = 7;
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {
    let x = azar() * ancho;
    let y = azar() * alto;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      if (azar() > 0.5) x += (azar() - 0.5) * ancho * 0.5;
      else y += (azar() - 0.5) * alto * 0.5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function texto(
  ctx: CanvasRenderingContext2D,
  cadena: string,
  x: number,
  y: number,
  tamano: number,
  peso = 600,
  alinear: CanvasTextAlign = "left",
) {
  ctx.font = `${peso} ${tamano}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = alinear;
  ctx.textBaseline = "middle";
  ctx.fillText(cadena, x, y);
}

/** Placa tipo «UNO»: azul, con serigrafía blanca (sin logotipos de marcas) */
export const texturaPlacaUno = () =>
  textura(640, 500, (ctx, w, h) => {
    ctx.fillStyle = "#0e6f8e";
    ctx.fillRect(0, 0, w, h);
    pistas(ctx, w, h, "rgba(120,200,225,0.25)");
    ctx.fillStyle = "#f2f6f8";
    ctx.strokeStyle = "#f2f6f8";
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    texto(ctx, "DIGITAL (PWM ~)", w * 0.62, 70, 22);
    texto(ctx, "POWER", w * 0.33, h - 70, 20);
    texto(ctx, "ANALOG IN", w * 0.72, h - 70, 20);
    texto(ctx, "UNO", w * 0.62, h * 0.47, 78, 800, "center");
    texto(ctx, "R3", w * 0.62, h * 0.47 + 58, 26, 600, "center");
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.36, 26, 0, Math.PI * 2);
    ctx.stroke();
    texto(ctx, "ON", w * 0.85, h * 0.36, 16, 700, "center");
    for (let i = 0; i < 14; i++) texto(ctx, String(13 - i), 150 + i * 32, 38, 13, 500, "center");
  });

/** Driver de motores: placa roja con serigrafía blanca */
export const texturaDriver = () =>
  textura(400, 400, (ctx, w, h) => {
    ctx.fillStyle = "#b5121b";
    ctx.fillRect(0, 0, w, h);
    pistas(ctx, w, h, "rgba(255,140,140,0.25)");
    ctx.fillStyle = "#fff4f4";
    ctx.strokeStyle = "#fff4f4";
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    texto(ctx, "L298N", w * 0.5, h * 0.78, 36, 800, "center");
    texto(ctx, "OUT1", 40, 120, 16);
    texto(ctx, "OUT2", 40, 270, 16);
    texto(ctx, "OUT3", w - 40, 120, 16, 600, "right");
    texto(ctx, "OUT4", w - 40, 270, 16, 600, "right");
    texto(ctx, "12V  GND  5V", w * 0.5, h - 30, 16, 600, "center");
  });

/** Sensor de ultrasonidos: placa azul */
export const texturaSonar = () =>
  textura(512, 240, (ctx, w, h) => {
    ctx.fillStyle = "#14479b";
    ctx.fillRect(0, 0, w, h);
    pistas(ctx, w, h, "rgba(140,180,255,0.22)");
    ctx.fillStyle = "#f3f6ff";
    texto(ctx, "HC-SR04", w * 0.5, h * 0.18, 30, 800, "center");
    texto(ctx, "T", w * 0.14, h * 0.86, 22, 700, "center");
    texto(ctx, "R", w * 0.86, h * 0.86, 22, 700, "center");
    texto(ctx, "VCC  TRIG  ECHO  GND", w * 0.5, h * 0.88, 15, 600, "center");
  });

/** Rejilla metálica de la cara de los ultrasonidos */
export const texturaRejilla = () =>
  textura(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#c9ccd2";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2a2c30";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6e737b";
    for (let y = 30; y < h - 20; y += 12) {
      for (let x = 30 + ((y / 12) % 2) * 6; x < w - 20; x += 12) {
        if (Math.hypot(x - w / 2, y - h / 2) < w * 0.35) ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    }
  });

/** Protoboard pequeña: blanca, con sus agujeros y las líneas roja y azul de alimentación */
export const texturaProtoboard = () =>
  textura(540, 400, (ctx, w, h) => {
    ctx.fillStyle = "#f3f2ee";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#3b3b3b";
    for (let fila = 0; fila < 17; fila++) {
      const y = 30 + fila * 20.5 + (fila > 7 ? 18 : 0) - (fila > 12 ? 0 : 0);
      if (y > h - 25) break;
      for (let col = 0; col < 25; col++) ctx.fillRect(28 + col * 20, y, 7, 7);
    }
    ctx.fillStyle = "#d7d5cf";
    ctx.fillRect(0, h / 2 - 6, w, 12);
    ctx.fillStyle = "#d6312b";
    ctx.fillRect(20, 14, w - 40, 3);
    ctx.fillStyle = "#2c5fd1";
    ctx.fillRect(20, h - 16, w - 40, 3);
  });

/** Agujeros de una tira de conectores hembra (se repite a lo largo) */
export const texturaConector = () => {
  const t = textura(64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#151515";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#020202";
    ctx.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4);
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
};

/** Chip negro con letras grises */
export const texturaChip = (rotulo: string) =>
  textura(512, 128, (ctx, w, h) => {
    ctx.fillStyle = "#151515";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#7d7d7d";
    texto(ctx, rotulo, w / 2, h / 2, 40, 600, "center");
    ctx.beginPath();
    ctx.arc(30, h / 2, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0a0a";
    ctx.fill();
  });

/** Sombra suave bajo el robot: un círculo difuminado */
export const texturaSombra = () =>
  textura(128, 128, (ctx) => {
    const degradado = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    degradado.addColorStop(0, "rgba(11,11,11,0.32)");
    degradado.addColorStop(1, "rgba(11,11,11,0)");
    ctx.fillStyle = degradado;
    ctx.fillRect(0, 0, 128, 128);
  });

/**
 * Dibujo del neumático (relieve). En el toro de la rueda, el borde de arriba y el de abajo de
 * esta imagen son la banda de rodadura (la parte que pisa el suelo); el centro es la cara interior.
 */
export const texturaDibujoNeumatico = () => {
  const t = textura(64, 128, (ctx, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    // Tacos en los dos bordes (que se juntan en la banda de rodadura)
    for (const y of [0, h - 22]) ctx.fillRect(14, y, 26, 22);
  });
  t.colorSpace = NoColorSpace; // es relieve, no color
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(44, 1);
  return t;
};

/** Envoltorio de una batería recargable 18650: cuerpo azul, franja clara en el polo positivo y el texto */
export const texturaPila = () => {
  const t = textura(256, 512, (ctx, w, h) => {
    const degradado = ctx.createLinearGradient(0, 0, w, 0);
    // Batería recargable 18650: envoltorio azul con franja clara
    degradado.addColorStop(0, "#1b3a7a");
    degradado.addColorStop(0.5, "#2a55a8");
    degradado.addColorStop(1, "#1b3a7a");
    ctx.fillStyle = degradado;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#d9dde6";
    ctx.fillRect(0, 0, w, h * 0.2);
    ctx.fillStyle = "#e8e8e8";
    ctx.save();
    ctx.translate(w * 0.25, h * 0.6);
    ctx.rotate(-Math.PI / 2);
    texto(ctx, "18650  3.7V", 0, 0, 34, 700, "center");
    ctx.restore();
    ctx.save();
    ctx.translate(w * 0.75, h * 0.6);
    ctx.rotate(-Math.PI / 2);
    texto(ctx, "RECARGABLE", 0, 0, 24, 600, "center");
    ctx.restore();
  });
  return t;
};
