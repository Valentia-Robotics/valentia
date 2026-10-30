/**
 * Las piezas del configurador en 3D, para hacerles una foto de estudio a cada una.
 * Cada función construye una pieza apoyada en el suelo (y = 0); la cámara la encuadra sola,
 * así que cada pieza usa sus propias unidades (casi todas en centímetros).
 * Las que también salen en el coche de la portada se hacen igual que allí (modeloCoche.ts).
 */
import {
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Path,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type Material,
} from "three";
import {
  texturaChip,
  texturaConector,
  texturaDibujoNeumatico,
  texturaDriver,
  texturaPlacaUno,
  texturaRejilla,
  texturaSonar,
} from "../../src/components/portada/texturasRobot";
import { crearModeloCoche } from "../../src/components/portada/modeloCoche";
import { Taller } from "./taller";
import {
  texturaAntena,
  texturaBlindaje,
  texturaDht22,
  texturaEsp32,
  texturaGrano,
  texturaLdr,
  texturaModulo,
  texturaOled,
  texturaPegatinaServo,
  texturaProtoboard400,
} from "./texturas";

/** Cómo se fotografía cada pieza: ángulo de la cámara (grados) y giro de la pieza */
export interface Encuadre {
  azimut?: number;
  elevacion?: number;
  giro?: number;
  /** Margen alrededor de la pieza (1 = justo) */
  margen?: number;
}

/**
 * modular: la pieza tal como va en los kits Valentia, que se unen con imanes y pines pogo
 * (sin cables sueltos; lo que no se puede imantar, como los servos, lleva un conector JST)
 */
export interface Opciones {
  modular?: boolean;
}

export interface Modelo {
  construir(t: Taller, o?: Opciones): void;
  encuadre?: Encuadre;
}

const PASO = 0.254; // separación entre pines (2,54 mm)

/** Material de plástico mate con un grano muy fino (como el de verdad) */
function plastico(t: Taller, color: number, rugosidad = 0.5) {
  return t.mat({ color, roughness: rugosidad, bumpMap: texturaGrano(), bumpScale: 0.25 });
}

/** Tira de conectores hembra (la de las placas tipo UNO) */
function hembra(t: Taller, n: number, x: number, y: number, z: number) {
  const agujeros = texturaConector();
  agujeros.repeat.set(n, 1);
  const lado = t.mat({ color: 0x151515, roughness: 0.55 });
  t.caja(
    n * PASO,
    0.85,
    0.25,
    t.caras(lado, t.mat({ map: agujeros, roughness: 0.55 })),
    x,
    y + 0.425,
    z,
  );
}

/** LED pequeño de montaje superficial (encendido o apagado) */
function led(t: Taller, x: number, y: number, z: number, color: number, encendido: boolean) {
  const m = encendido
    ? t.mat({ color, emissive: color, emissiveIntensity: 2.2, roughness: 0.2 })
    : t.mat({ color, roughness: 0.25, transparent: true, opacity: 0.85 });
  t.caja(0.16, 0.07, 0.09, m, x, y + 0.035, z);
}

/** Forma de «estadio» (rectángulo con los extremos redondos) con agujeros a lo largo */
function estadio(largo: number, ancho: number, agujeros: number[] = [], radioAgujero = 0.12) {
  const r = ancho / 2;
  const s = new Shape();
  s.moveTo(0, -r);
  s.lineTo(largo, -r);
  s.absarc(largo, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(0, r);
  s.absarc(0, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  for (const x of agujeros) {
    const p = new Path();
    p.absarc(x, 0, radioAgujero, 0, Math.PI * 2, true);
    s.holes.push(p);
  }
  return s;
}

/** Rectángulo con esquinas redondeadas (centrado), con agujeros opcionales */
function rectanguloRedondo(
  w: number,
  h: number,
  r: number,
  agujeros: [number, number, number][] = [],
) {
  const s = new Shape();
  const [x0, y0] = [-w / 2, -h / 2];
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0);
  s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r);
  s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h);
  s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  for (const [x, y, ra] of agujeros) {
    const p = new Path();
    p.absarc(x, y, ra, 0, Math.PI * 2, true);
    s.holes.push(p);
  }
  return s;
}

/** Pieza de metacrilato cortada con láser (con sus cantos brillantes) */
function acrilico(
  t: Taller,
  forma: Shape,
  grosor: number,
  material: Material,
  padre: Group = t.grupo,
) {
  const geo = new ExtrudeGeometry(forma, {
    depth: grosor,
    bevelEnabled: true,
    bevelThickness: grosor * 0.06,
    bevelSize: grosor * 0.06,
    bevelSegments: 1,
    curveSegments: 18,
  });
  geo.translate(0, 0, -grosor / 2);
  const malla = new Mesh(geo, material);
  malla.castShadow = true;
  malla.receiveShadow = true;
  const cantos = new LineSegments(
    new EdgesGeometry(geo, 30),
    new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
  );
  const g = new Group();
  g.add(malla, cantos);
  padre.add(g);
  return g;
}

/** Muelle de contacto de un portapilas (hélice a lo largo de x) */
function muelle(
  t: Taller,
  x: number,
  y: number,
  z: number,
  sentido: 1 | -1,
  radio: number,
  largo: number,
) {
  const puntos: [number, number, number][] = [];
  const vueltas = 5;
  const n = vueltas * 28;
  for (let k = 0; k <= n; k++) {
    const a = (k / 28) * Math.PI * 2;
    const r = radio * (1 - 0.35 * (k / n)); // cónico, como los de verdad
    puntos.push([x + sentido * (k / n) * largo, y + r * Math.sin(a), z + r * Math.cos(a)]);
  }
  t.tubo(puntos, radio * 0.075, t.acero, 600);
}

/** Un par de cables (rojo y negro) con las puntas estañadas */
function cablesAlimentacion(
  t: Taller,
  puntos: [number, number, number][],
  radio: number,
  separacion: number,
) {
  const rojo = t.mat({ color: 0xc62828, roughness: 0.4 });
  const negro = t.mat({ color: 0x1a1a1a, roughness: 0.4 });
  [rojo, negro].forEach((m, i) => {
    const d = i * separacion;
    const p = puntos.map(([x, y, z]) => [x, y, z + d] as [number, number, number]);
    t.tubo(p, radio, m);
    const [ux, uy, uz] = p[p.length - 1];
    const [px, , pz] = p[p.length - 2];
    const largo = Math.hypot(ux - px, uz - pz) || 1;
    t.cilindro(
      radio * 0.55,
      radio * 6,
      t.estano,
      ux + ((ux - px) / largo) * radio * 3,
      uy,
      uz + ((uz - pz) / largo) * radio * 3,
      "x",
    );
  });
}

/** Cables de servo (marrón, rojo y naranja) que acaban en un conector negro */
function cablesServo(t: Taller, salida: [number, number, number], escala: number) {
  const colores = [0x5b3a24, 0xc9302c, 0xf08a24];
  const r = 0.045 * escala;
  const [sx, sy, sz] = salida;
  colores.forEach((color, i) => {
    const dz = (i - 1) * r * 2.05;
    t.tubo(
      [
        [sx, sy, sz + dz],
        [sx + 0.5 * escala, sy - 0.1 * escala, sz + dz],
        [sx + 1.0 * escala, sy * 0.4, sz + dz + 0.3 * escala],
        [sx + 1.2 * escala, r, sz + dz + 1.3 * escala],
        [sx + 0.9 * escala, r, sz + dz + 2.3 * escala],
        [sx + 0.1 * escala, r, sz + dz + 2.6 * escala],
        [sx - 0.6 * escala, r, sz + dz + 2.6 * escala],
      ],
      r,
      t.mat({ color, roughness: 0.42 }),
    );
  });
  t.caja(
    1.4 * escala,
    0.25 * escala,
    0.76 * escala,
    t.plasticoNegro,
    sx - 1.25 * escala,
    0.125 * escala,
    sz + 2.6 * escala,
  );
}

/** Módulo de sensor pequeño (placa azul, pines acodados, potenciómetro, comparador y LEDs) */
function moduloSensor(t: Taller, rotulos: string[], sensor: (y: number) => void) {
  const y = 0.16;
  const n = rotulos.length;
  const serigrafia = texturaModulo({
    ancho: 640,
    alto: 280,
    color: "#1e4fa8",
    pistasColor: "rgba(140,180,255,0.22)",
    semilla: n * 5,
    rotulos: rotulos.map((texto, i) => ({
      texto,
      x: 92,
      y: 140 + (i - (n - 1) / 2) * 50.8,
      tamano: 20,
      peso: 700,
      alinear: "left" as const,
    })),
    pads: [{ x: 450, y: 220, n: 1, paso: 0, r: 26 }],
  });
  t.pcb(3.2, 1.4, 0.16, 0x153d86, serigrafia, 0, y, 0);
  t.pinesAcodados(n, -1.45, y, 0, -1);
  for (let i = 0; i < n; i++) t.soldadura(-1.45, y - 0.2, (i - (n - 1) / 2) * PASO, 0.05);
  // Potenciómetro azul con su tornillo de latón
  const azul = t.mat({ color: 0x2f62d8, roughness: 0.4 });
  t.caja(0.66, 0.48, 0.66, azul, 0.25, y + 0.24, -0.3);
  t.cilindro(0.2, 0.08, t.laton, 0.25, y + 0.52, -0.3, "y", 24);
  t.caja(0.3, 0.03, 0.05, t.plasticoNegro, 0.25, y + 0.56, -0.3).rotation.y = 0.6;
  // Comparador, resistencias y LEDs
  t.chip(-0.45, y, 0.3, 0.5, 0.38, 4);
  t.smd(0.3, y, 0.35, 0x222222);
  t.smd(0.6, y, 0.35, 0x222222);
  t.smd(-0.45, y, -0.3, 0xb48a5a);
  led(t, -0.9, y, -0.45, 0xff3b30, true);
  led(t, -0.9, y, 0.45, 0x30d158, false);
  sensor(y);
}

/** Rueda del coche (como la de la portada): neumático con dibujo y llanta amarilla */
function rueda(t: Taller, x: number, y: number, z: number, giro = 0) {
  const g = new Group();
  g.position.set(x, y, z);
  g.rotation.y = giro;
  t.grupo.add(g);
  const goma = t.mat({
    color: 0x1e1e1e,
    roughness: 0.88,
    bumpMap: texturaDibujoNeumatico(),
    bumpScale: 1.2,
  });
  const llanta = t.mat({ color: 0xe9b910, roughness: 0.36 });
  t.malla(new TorusGeometry(0.3, 0.085, 24, 96), goma, 0, 0, 0, g);
  const disco = t.cilindro(0.255, 0.07, llanta, 0, 0, 0, "z", 40, 0.255, g);
  disco.scale.set(1, 0.6, 1);
  for (let k = 0; k < 3; k++)
    t.caja(0.04, 0.42, 0.075, llanta, 0, 0, 0.03, g).rotation.z = (k * Math.PI) / 3;
  t.cilindro(0.06, 0.12, llanta, 0, 0, 0, "z", 20, 0.06, g);
  t.malla(new TorusGeometry(0.255, 0.018, 10, 64), llanta, 0, 0, 0.035, g);
  t.cilindro(0.02, 0.13, t.acero, 0, 0, 0, "z", 12, 0.02, g);
}

/** Servo genérico (SG90 o MG996R) */
function servo(
  t: Taller,
  o: {
    escala: number;
    carcasa: Material;
    pegatina: ReturnType<typeof texturaPegatinaServo>;
    eje: Material;
    bocinaRedonda: boolean;
    /** "jst": cable corto que acaba en un conector JST blanco pegado al servo */
    cable?: "suelto" | "jst";
  },
) {
  const e = o.escala;
  const blanco = t.mat({ color: 0xf3f3ef, roughness: 0.45 });
  // Cuerpo, orejetas de sujeción y tapa
  t.redonda(2.3 * e, 1.6 * e, 1.22 * e, 0.06 * e, o.carcasa as never, 0, 0.8 * e, 0);
  const orejetas = rectanguloRedondo(3.25 * e, 1.22 * e, 0.12 * e, [
    [-1.4 * e, 0, 0.11 * e],
    [1.4 * e, 0, 0.11 * e],
  ]);
  const g = acrilico(t, orejetas, 0.25 * e, o.carcasa);
  g.rotation.x = -Math.PI / 2;
  g.position.y = 1.72 * e;
  (g.children[1] as LineSegments).visible = false;
  t.redonda(2.3 * e, 0.8 * e, 1.22 * e, 0.06 * e, o.carcasa as never, 0, 2.25 * e, 0);
  t.cilindro(0.6 * e, 0.3 * e, o.carcasa, -0.55 * e, 2.78 * e, 0, "y", 40);
  t.cilindro(0.32 * e, 0.2 * e, o.carcasa, 0.15 * e, 2.73 * e, 0, "y", 32);
  // Eje de salida y bocina
  t.cilindro(0.24 * e, 0.3 * e, o.eje, -0.55 * e, 3.05 * e, 0, "y", 24);
  const bocina = new Group();
  bocina.position.set(-0.55 * e, 3.2 * e, 0);
  bocina.rotation.y = 1.0;
  t.grupo.add(bocina);
  if (o.bocinaRedonda) {
    const disco = rectanguloRedondo(2.4 * e, 2.4 * e, 1.2 * e, [
      [0.8 * e, 0, 0.08 * e],
      [-0.8 * e, 0, 0.08 * e],
      [0, 0.8 * e, 0.08 * e],
      [0, -0.8 * e, 0.08 * e],
      [0.55 * e, 0.55 * e, 0.07 * e],
      [-0.55 * e, -0.55 * e, 0.07 * e],
    ]);
    const d = acrilico(t, disco, 0.2 * e, blanco, bocina);
    d.rotation.x = -Math.PI / 2;
    (d.children[1] as LineSegments).visible = false;
  } else {
    for (const [largo, giro] of [
      [3.6, 0],
      [2.4, Math.PI / 2],
    ]) {
      // Agujeros a lo largo de cada brazo (a los dos lados del centro)
      const agujeros = [0.4, 0.7, 1.0, 1.3, 1.6]
        .filter((a) => a < largo / 2 - 0.2)
        .flatMap((a) => [(largo / 2 - a) * e, (largo / 2 + a) * e]);
      const brazo = estadio(largo * e, 0.55 * e, agujeros, 0.06 * e);
      const b = acrilico(t, brazo, 0.15 * e, blanco, bocina);
      b.rotation.x = -Math.PI / 2;
      b.rotation.z = giro;
      // la forma empieza en 0: la centramos
      b.children.forEach((c) => (c.position.x = (-largo / 2) * e));
      (b.children[1] as LineSegments).visible = false;
    }
  }
  t.cilindro(0.12 * e, 0.1 * e, t.acero, -0.55 * e, 3.32 * e, 0, "y", 16);
  // Pegatina en el costado
  const p = new Mesh(
    new PlaneGeometry(2.0 * e, 1.0 * e),
    t.mat({ map: o.pegatina, roughness: 0.4 }),
  );
  p.position.set(0, 0.85 * e, 0.612 * e);
  t.grupo.add(p);
  if (o.cable === "jst") cableJst(t, [1.15 * e, 1.3 * e, 0.2 * e], e);
  else cablesServo(t, [1.15 * e, 1.3 * e, 0.2 * e], e);
}

/** Cable corto del servo (marrón, rojo y naranja) que baja pegado a él hasta un conector JST */
function cableJst(t: Taller, [sx, sy, sz]: [number, number, number], e: number) {
  const r = 0.04 * e;
  [0x5b3a24, 0xc9302c, 0xf08a24].forEach((color, i) => {
    const dz = (i - 1) * r * 2.05;
    t.tubo(
      [
        [sx, sy, sz + dz],
        [sx + 0.18 * e, sy - 0.05 * e, sz + dz],
        [sx + 0.26 * e, sy - 0.35 * e, sz + dz],
        [sx + 0.26 * e, 0.75 * e, sz + dz],
      ],
      r,
      t.mat({ color, roughness: 0.42 }),
      48,
    );
  });
  conectorJst(t, sx + 0.26 * e, 0.5 * e, sz, e);
}

/** Conector JST blanco (3 vías), en vertical */
function conectorJst(t: Taller, x: number, y: number, z: number, e = 1, padre?: Group) {
  const blanco = t.mat({ color: 0xf1eee4, roughness: 0.5 });
  t.redonda(0.32 * e, 0.5 * e, 0.62 * e, 0.03 * e, blanco, x, y, z, padre);
  // Pestaña de cierre y las tres ventanas de los contactos
  t.caja(0.06 * e, 0.24 * e, 0.3 * e, blanco, x + 0.18 * e, y + 0.06 * e, z, padre);
  for (const k of [-1, 0, 1])
    t.caja(0.02 * e, 0.08 * e, 0.1 * e, t.oro, x - 0.16 * e, y - 0.12 * e, z + k * 0.17 * e, padre);
}

/**
 * Conector imantado de los kits Valentia: carcasa negra con pines pogo dorados en el centro y un
 * imán en cada punta. Mira hacia +x (la cara de contacto); `n` = número de pines.
 */
function conectorImantado(
  t: Taller,
  padre: Group,
  [x, y, z]: [number, number, number],
  { giro = 0, n = 5, macho = true }: { giro?: number; n?: number; macho?: boolean } = {},
) {
  const g = new Group();
  g.position.set(x, y, z);
  g.rotation.y = giro;
  padre.add(g);
  const largo = 0.32 * n + 0.9;
  t.redonda(0.45, 0.55, largo, 0.12, plastico(t, 0x161616, 0.4), 0, 0, 0, g);
  // Cara de contacto un poco más clara
  t.caja(0.02, 0.36, largo - 0.24, t.mat({ color: 0x2a2a2c, roughness: 0.35 }), 0.226, 0, 0, g);
  for (let i = 0; i < n; i++) {
    const zz = (i - (n - 1) / 2) * 0.32;
    if (macho) t.cilindro(0.06, 0.16, t.oro, 0.29, 0, zz, "x", 16, 0.045, g);
    else t.cilindro(0.075, 0.02, t.oro, 0.235, 0, zz, "x", 16, 0.075, g);
  }
  const iman = t.mat({ color: 0xc9ccd0, metalness: 0.9, roughness: 0.25 });
  for (const s of [-1, 1])
    t.cilindro(0.15, 0.03, iman, 0.235, 0, s * (largo / 2 - 0.3), "x", 24, 0.15, g);
  return g;
}

// =====================================================================================
export const MODELOS: Record<string, Modelo> = {
  // ---------------------------------------------------------------- PLACAS
  "arduino-uno-r3": {
    encuadre: { elevacion: 38, azimut: 28 },
    construir(t) {
      const y = 0.16;
      t.pcb(6.86, 5.34, 0.16, 0x0b5f7a, texturaPlacaUno(), 0, y, 0);
      // USB (metal) y conector de alimentación (negro) en el borde izquierdo
      t.caja(1.6, 1.1, 1.2, t.acero, -3.23, y + 0.55, -1.0);
      t.caja(0.04, 0.72, 0.82, t.plasticoNegro, -4.04, y + 0.55, -1.0);
      t.caja(1.4, 1.1, 0.9, plastico(t, 0x141414, 0.45), -3.03, y + 0.55, 1.6);
      t.cilindro(0.3, 0.05, t.mat({ color: 0x050505, roughness: 0.9 }), -3.74, y + 0.6, 1.6, "x");
      // Conectores hembra de los bordes
      hembra(t, 10, -0.1, y, -2.47);
      hembra(t, 8, 2.45, y, -2.47);
      hembra(t, 8, 0.3, y, 2.47);
      hembra(t, 6, 2.65, y, 2.47);
      // Microcontrolador en su zócalo
      t.caja(3.65, 0.3, 1.0, t.plasticoNegro, 1.25, y + 0.15, 0.95);
      t.caja(
        3.5,
        0.4,
        0.73,
        t.caras(
          t.mat({ color: 0x151515, roughness: 0.4 }),
          t.mat({ map: texturaChip("ATMEGA328P"), roughness: 0.4 }),
        ),
        1.25,
        y + 0.5,
        0.95,
      );
      for (let i = 0; i < 14; i++)
        for (const s of [-1, 1])
          t.caja(0.05, 0.3, 0.1, t.estano, 1.25 - 1.65 + i * PASO, y + 0.36, 0.95 + s * 0.42);
      // Cristal, condensadores, regulador, chip USB, botón de reinicio y pines ICSP
      t.redonda(1.0, 0.32, 0.42, 0.14, t.acero, -0.55, y + 0.16, 0.9);
      const lata = t.mat({ color: 0xbfc4ca, metalness: 0.9, roughness: 0.3 });
      for (const x of [-1.95, -1.25]) {
        t.cilindro(0.3, 0.62, lata, x, y + 0.31, 1.45, "y", 32);
        t.caja(0.42, 0.01, 0.04, t.plasticoNegro, x, y + 0.625, 1.45);
        t.caja(0.04, 0.01, 0.42, t.plasticoNegro, x, y + 0.625, 1.45);
      }
      t.caja(0.65, 0.22, 0.38, t.plasticoNegro, -1.95, y + 0.11, 0.45);
      t.caja(0.65, 0.04, 0.25, t.acero, -1.95, y + 0.02, 0.2);
      t.chip(-1.6, y, -1.25, 0.7, 0.7, 8);
      t.caja(0.6, 0.25, 0.6, t.acero, -2.0, y + 0.125, -2.0);
      t.cilindro(0.18, 0.12, plastico(t, 0x2a2a2a), -2.0, y + 0.3, -2.0, "y", 24);
      t.pinesMacho(3, 3.0, y + 0.125, 0.3, "z", 0.6, 0);
      t.pinesMacho(3, 3.25, y + 0.125, 0.3, "z", 0.6, 0);
      led(t, 2.4, y, -0.35, 0x34ff6a, true);
      led(t, -0.6, y, -1.25, 0xffb020, false);
      led(t, -0.6, y, -1.0, 0xffb020, false);
      led(t, -0.6, y, -0.75, 0xffb020, false);
      for (const [x, z] of [
        [0.2, -1.2],
        [0.5, -1.2],
        [-0.9, 0.3],
        [2.6, 0.9],
        [2.9, 1.3],
        [-2.6, -0.1],
      ])
        t.smd(x, y, z, 0x2a2a2a);
    },
  },

  "esp32-devkit": {
    encuadre: { elevacion: 36, azimut: 26 },
    construir(t) {
      const y = 1.01;
      t.pcb(5.5, 2.8, 0.16, 0x111214, texturaEsp32(), 0, y, 0);
      for (const z of [-1.22, 1.22]) t.pinesMacho(15, -0.622, 0.725, z, "x", 0.4, 0.6);
      for (let i = 0; i < 15; i++)
        for (const z of [-1.22, 1.22]) t.soldadura(-2.4 + i * PASO, y, z, 0.07);
      // Módulo wifi: placa negra, blindaje metálico y antena
      t.caja(2.55, 0.08, 1.8, t.mat({ color: 0x121315, roughness: 0.5 }), 1.875, y + 0.04, 0);
      t.caja(
        1.75,
        0.3,
        1.62,
        t.caras(
          t.mat({ color: 0xc4c8cd, metalness: 0.9, roughness: 0.3 }),
          t.mat({ map: texturaBlindaje(), metalness: 0.85, roughness: 0.32 }),
        ),
        1.48,
        y + 0.23,
        0,
      );
      const antena = texturaAntena();
      antena.center.set(0.5, 0.5);
      antena.rotation = Math.PI / 2;
      t.caja(
        0.8,
        0.082,
        1.8,
        t.caras(t.mat({ color: 0x121315 }), t.mat({ map: antena, roughness: 0.45 })),
        2.75,
        y + 0.041,
        0,
      );
      // USB, botones, regulador, chip USB y LEDs
      t.caja(0.6, 0.3, 0.75, t.acero, -2.55, y + 0.15, 0);
      for (const z of [-0.7, 0.7]) {
        t.caja(0.42, 0.15, 0.32, t.acero, -1.85, y + 0.075, z);
        t.cilindro(0.1, 0.1, t.plasticoNegro, -1.85, y + 0.2, z, "y", 16);
      }
      t.caja(0.65, 0.16, 0.35, t.plasticoNegro, -0.3, y + 0.08, -0.5);
      t.caja(0.65, 0.04, 0.2, t.acero, -0.3, y + 0.02, -0.75);
      t.chip(-0.3, y, 0.4, 0.5, 0.5, 6);
      led(t, 0.25, y, -0.6, 0xff3b30, true);
      led(t, 0.25, y, 0.6, 0x3d7bff, false);
      for (const [x, z] of [
        [-1.0, -0.6],
        [-1.0, 0.6],
        [-1.3, -0.2],
        [0.5, 0.0],
      ])
        t.smd(x, y, z, 0xb48a5a);
    },
  },

  // ---------------------------------------------------------------- MOTORES
  "motor-dc-reductora": {
    encuadre: { elevacion: 28, azimut: 38 },
    construir(t) {
      const amarillo = plastico(t, 0xe9b910, 0.38);
      const y = 1.125;
      t.redonda(3.7, 2.25, 1.9, 0.12, amarillo, 0, y, 0);
      t.caja(3.72, 2.27, 0.03, t.mat({ color: 0xc99d0b, roughness: 0.5 }), 0, y, 0);
      // Eje blanco que atraviesa la caja (sale por los dos lados)
      const blanco = t.mat({ color: 0xf1f1ec, roughness: 0.45 });
      t.cilindro(0.27, 3.4, blanco, -1.1, y, 0, "z", 28);
      t.cilindro(0.42, 0.12, amarillo, -1.1, y, 0.98, "z", 28);
      // Agujeros de sujeción y saliente de centrado
      const hueco = t.mat({ color: 0x0d0d0d, roughness: 0.9 });
      for (const x of [0.45, 1.2]) t.cilindro(0.17, 1.92, hueco, x, 0.55, 0, "z", 20);
      t.cilindro(0.2, 0.3, amarillo, -0.1, 1.7, 1.05, "z", 20);
      // Motor (lata metálica achatada), abrazadera blanca y tapa con los terminales
      const lata = t.mat({ color: 0xc3c7cd, metalness: 0.95, roughness: 0.25 });
      t.cilindro(1.0, 2.6, lata, 3.15, y, 0, "x", 48).scale.z = 0.78;
      t.cilindro(1.06, 0.5, blanco, 2.35, y, 0, "x", 48).scale.z = 0.8;
      t.cilindro(0.92, 0.3, plastico(t, 0x2a2a2a, 0.6), 4.6, y, 0, "x", 40).scale.z = 0.76;
      t.cilindro(0.18, 0.15, lata, 4.8, y, 0, "x", 16);
      for (const s of [-1, 1]) t.caja(0.12, 0.3, 0.05, t.estano, 4.82, y + s * 0.5, 0);
      cablesAlimentacion(
        t,
        [
          [4.85, y + 0.5, 0],
          [5.4, y + 0.6, 0.2],
          [5.9, 0.4, 1.0],
          [5.5, 0.05, 2.2],
          [4.2, 0.05, 2.6],
        ],
        0.07,
        0.16,
      );
    },
  },

  "servo-sg90": {
    encuadre: { elevacion: 26, azimut: 30 },
    construir(t) {
      servo(t, {
        escala: 1,
        carcasa: t.fisico({
          color: 0x1f5bd0,
          roughness: 0.28,
          clearcoat: 0.6,
          clearcoatRoughness: 0.2,
        }),
        pegatina: texturaPegatinaServo("SG90", "9 g · Micro servo", "#1d4fb8"),
        eje: t.mat({ color: 0xf3f3ef, roughness: 0.45 }),
        bocinaRedonda: false,
      });
    },
  },

  "servo-mg996r": {
    encuadre: { elevacion: 26, azimut: 30 },
    construir(t, o) {
      servo(t, {
        escala: 1.75,
        carcasa: plastico(t, 0x1a1a1a, 0.45),
        pegatina: texturaPegatinaServo("MG996R", "Alto par · 13 kg·cm", "#202226"),
        eje: t.laton,
        bocinaRedonda: true,
        cable: o?.modular ? "jst" : "suelto",
      });
    },
  },

  "driver-motores-l298n": {
    encuadre: { elevacion: 34, azimut: 32 },
    construir(t) {
      const y = 0.046;
      t.pcb(0.5, 0.5, 0.016, 0x9e0f17, texturaDriver(), 0, y, 0);
      const aluminio = t.mat({ color: 0x1e1f22, metalness: 0.6, roughness: 0.45 });
      t.caja(0.26, 0.04, 0.17, aluminio, 0.02, y + 0.02, -0.04);
      for (let i = 0; i < 8; i++)
        t.caja(0.26, 0.26, 0.012, aluminio, 0.02, y + 0.17, -0.115 + i * 0.022);
      const azul = t.mat({ color: 0x1f5fd6, roughness: 0.45 });
      const borne = (x: number, z: number, n: number, girado: boolean) => {
        const largo = 0.075 * n;
        t.caja(girado ? largo : 0.08, 0.08, girado ? 0.08 : largo, azul, x, y + 0.04, z);
        for (let i = 0; i < n; i++) {
          const o = -largo / 2 + 0.0375 + i * 0.075;
          t.cilindro(
            0.022,
            0.015,
            t.acero,
            girado ? x + o : x,
            y + 0.087,
            girado ? z : z + o,
            "y",
            16,
          );
          t.caja(
            0.03,
            0.004,
            0.006,
            t.plasticoNegro,
            girado ? x + o : x,
            y + 0.095,
            girado ? z : z + o,
          );
        }
      };
      borne(-0.2, -0.07, 2, false);
      borne(0.2, -0.07, 2, false);
      borne(0, 0.2, 3, true);
      t.cilindro(
        0.045,
        0.13,
        t.mat({ color: 0x1b2a55, roughness: 0.35 }),
        -0.13,
        y + 0.065,
        0.1,
        "y",
        24,
      );
      t.cilindro(
        0.045,
        0.13,
        t.mat({ color: 0x1b2a55, roughness: 0.35 }),
        0.13,
        y + 0.065,
        0.1,
        "y",
        24,
      );
      for (let i = 0; i < 6; i++)
        t.caja(0.012, 0.07, 0.012, t.oro, 0.0 - 0.0625 + i * 0.025, y + 0.035, 0.1);
      t.caja(0.155, 0.02, 0.03, t.plasticoNegro, 0, y + 0.01, 0.1);
      // Puentes (jumpers) negros y el regulador
      for (const x of [-0.2, 0.2]) t.caja(0.03, 0.05, 0.06, t.plasticoNegro, x, y + 0.025, 0.12);
      t.caja(0.06, 0.03, 0.05, t.plasticoNegro, 0.17, y + 0.015, 0.2 - 0.06);
      led(t, 0.17, y, -0.2, 0xff3b30, true);
      (t.grupo.children.at(-1) as Mesh).scale.setScalar(0.18);
      t.grupo.children.at(-1)!.position.y = y + 0.006;
    },
  },

  // ---------------------------------------------------------------- SENSORES
  "sensor-ultrasonidos-hc-sr04": {
    encuadre: { elevacion: 18, azimut: 24 },
    construir(t) {
      const yc = 0.2;
      const azulLado = t.mat({ color: 0x113d85, roughness: 0.6 });
      const azulCara = t.mat({ map: texturaSonar(), roughness: 0.5 });
      t.caja(0.53, 0.24, 0.016, t.caras(azulLado, azulCara, 4), 0, yc, 0);
      const plata = t.mat({ color: 0xd3d6db, metalness: 0.95, roughness: 0.22 });
      const rejilla = t.mat({ map: texturaRejilla(), metalness: 0.5, roughness: 0.5 });
      for (const x of [-0.135, 0.135])
        t.cilindro(0.095, 0.13, [plata, rejilla, plata], x, yc, 0.073, "z", 48);
      t.redonda(0.09, 0.04, 0.02, 0.008, plata, 0, yc + 0.01, 0.018);
      for (let i = 0; i < 4; i++) {
        const x = -0.045 + i * 0.03;
        t.caja(0.012, 0.09, 0.012, t.oro, x, 0.045, -0.014);
      }
      // Detrás: los chips
      t.caja(0.12, 0.02, 0.06, t.plasticoNegro, -0.1, yc - 0.02, -0.018);
      t.caja(0.12, 0.02, 0.06, t.plasticoNegro, 0.1, yc - 0.02, -0.018);
    },
  },

  "sensor-linea-tcrt5000": {
    encuadre: { elevacion: 40, azimut: 30 },
    construir(t) {
      moduloSensor(t, ["VCC", "GND", "D0"], (y) => {
        t.caja(0.6, 0.55, 1.0, plastico(t, 0x121212, 0.4), 1.15, y + 0.275, 0);
        const emisor = t.fisico({
          color: 0x3a6cff,
          roughness: 0.08,
          transparent: true,
          opacity: 0.85,
          clearcoat: 1,
        });
        const receptor = t.fisico({ color: 0x0a0a0a, roughness: 0.08, clearcoat: 1 });
        t.malla(
          new SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          emisor,
          1.15,
          y + 0.55,
          -0.24,
        );
        t.malla(
          new SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          receptor,
          1.15,
          y + 0.55,
          0.24,
        );
      });
    },
  },

  "sensor-dht22": {
    encuadre: { elevacion: 16, azimut: 28 },
    construir(t) {
      const blanco = plastico(t, 0xf2f2ee, 0.5);
      t.caja(
        1.5,
        2.5,
        0.77,
        t.caras(blanco, t.mat({ map: texturaDht22(), roughness: 0.5 }), 4),
        0,
        1.0 + 1.25,
        0,
      );
      // Orejeta de arriba con su agujero
      const orejeta = rectanguloRedondo(0.95, 0.7, 0.3, [[0, 0.05, 0.16]]);
      const g = acrilico(t, orejeta, 0.22, blanco);
      g.position.set(0, 3.7, -0.2);
      (g.children[1] as LineSegments).visible = false;
      // Las cuatro patas
      for (let i = 0; i < 4; i++) t.caja(0.05, 1.0, 0.03, t.estano, -0.381 + i * PASO, 0.5, 0);
    },
  },

  "sensor-presion-bmp280": {
    encuadre: { elevacion: 40, azimut: 26 },
    construir(t) {
      const y = 0.12;
      const nombres = ["VCC", "GND", "SCL", "SDA", "CSB", "SDO"];
      t.pcb(
        1.5,
        1.15,
        0.12,
        0x3f1d66,
        texturaModulo({
          ancho: 600,
          alto: 460,
          color: "#5b2a86",
          pistasColor: "rgba(210,170,255,0.2)",
          semilla: 23,
          rotulos: [
            ...nombres.map((texto, i) => ({
              texto,
              x: 300 + (i - 2.5) * 101.6,
              y: 345,
              tamano: 24,
              peso: 700,
            })),
            { texto: "BMP280", x: 230, y: 70, tamano: 34, peso: 800 },
          ],
          pads: [
            { x: 300 - 2.5 * 101.6, y: 410, n: 6, paso: 101.6, r: 30 },
            { x: 520, y: 70, n: 1, paso: 0, r: 40 },
          ],
        }),
        0,
        y,
        0,
      );
      // Sensor (cajita metálica con un agujerito), regulador y condensadores
      t.caja(0.25, 0.1, 0.2, t.acero, 0.3, y + 0.05, -0.1);
      t.cilindro(0.025, 0.02, t.plasticoNegro, 0.36, y + 0.1, -0.13, "y", 12);
      t.chip(-0.35, y, -0.1, 0.3, 0.16, 3);
      t.smd(-0.05, y, -0.15, 0xb48a5a, 0.12, 0.06, true);
      t.smd(-0.05, y, 0.1, 0xb48a5a, 0.12, 0.06, true);
      t.smd(0.55, y, 0.15, 0x2a2a2a, 0.12, 0.06);
      // La tira de pines, suelta al lado (se suelda en casa)
      t.pinesMacho(6, -0.2, 0.3, -1.2, "x", 0.6, 0.3);
    },
  },

  "sensor-luz-ldr": {
    encuadre: { elevacion: 38, azimut: 30 },
    construir(t) {
      moduloSensor(t, ["VCC", "GND", "DO", "AO"], (y) => {
        for (const z of [-0.12, 0.12]) t.caja(0.03, 0.5, 0.03, t.estano, 1.15, y + 0.25, z);
        const ceramica = t.mat({ color: 0xd9d3c4, roughness: 0.6 });
        const cara = t.fisico({
          map: texturaLdr(),
          roughness: 0.15,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
        });
        t.cilindro(0.26, 0.12, [ceramica, cara, ceramica], 1.15, y + 0.56, 0, "y", 40);
      });
    },
  },

  "pantalla-oled-096": {
    encuadre: { elevacion: 42, azimut: 22 },
    construir(t) {
      const y = 1.01;
      t.pcb(
        2.7,
        2.8,
        0.16,
        0x0f2d66,
        texturaModulo({
          ancho: 540,
          alto: 560,
          color: "#163e86",
          pistasColor: "rgba(140,180,255,0.2)",
          semilla: 41,
          rotulos: ["GND", "VCC", "SCL", "SDA"].map((texto, i) => ({
            texto,
            x: 270 + (i - 1.5) * 50.8,
            y: 72,
            tamano: 15,
            peso: 700,
          })),
          pads: [
            { x: 270 - 1.5 * 50.8, y: 30, n: 4, paso: 50.8, r: 15 },
            { x: 30, y: 30, n: 1, paso: 0, r: 22 },
            { x: 510, y: 30, n: 1, paso: 0, r: 22 },
            { x: 30, y: 530, n: 1, paso: 0, r: 22 },
            { x: 510, y: 530, n: 1, paso: 0, r: 22 },
          ],
        }),
        0,
        y,
        0,
      );
      t.pinesMacho(4, 0, 0.725, -1.25, "x", 0.4, 0.6);
      for (let i = 0; i < 4; i++) t.soldadura(-0.381 + i * PASO, y, -1.25, 0.07);
      // Cristal de la pantalla y la imagen encendida
      const cristal = t.fisico({
        color: 0x0b0c0f,
        roughness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
      });
      t.caja(2.66, 0.14, 1.95, cristal, 0, y + 0.07, 0.2);
      const imagen = texturaOled();
      const pantalla = new Mesh(
        new PlaneGeometry(2.17, 1.085),
        t.mat({
          color: 0x000000,
          emissive: 0xffffff,
          emissiveMap: imagen,
          emissiveIntensity: 1.6,
          roughness: 0.1,
        }),
      );
      pantalla.rotation.x = -Math.PI / 2;
      pantalla.position.set(0, y + 0.142, 0.12);
      t.grupo.add(pantalla);
      // Cinta flexible naranja por debajo del cristal
      t.caja(1.0, 0.02, 0.3, t.mat({ color: 0xd98a2b, roughness: 0.4 }), 0, y + 0.01, 1.25);
    },
  },

  "zumbador-activo": {
    encuadre: { elevacion: 30, azimut: 30, margen: 1.25 },
    construir(t) {
      const perfil = [
        [0.001, 0],
        [0.58, 0],
        [0.6, 0.03],
        [0.6, 0.86],
        [0.57, 0.94],
        [0.5, 0.96],
        [0.14, 0.96],
        [0.11, 0.92],
        [0.1, 0.8],
        [0.001, 0.8],
      ].map(([x, y]) => new Vector2(x, y));
      const cuerpo = new LatheGeometry(perfil, 64);
      cuerpo.translate(0, 1.3, 0);
      t.malla(cuerpo, plastico(t, 0x151515, 0.55));
      // El «+» en relieve
      const gris = t.mat({ color: 0x3a3a3a, roughness: 0.5 });
      t.caja(0.16, 0.02, 0.04, gris, 0.32, 2.27, 0.18);
      t.caja(0.04, 0.02, 0.16, gris, 0.32, 2.27, 0.18);
      // Patas (la positiva, más larga, doblada)
      t.caja(0.05, 1.3, 0.05, t.estano, -0.38, 0.65, 0);
      t.tubo(
        [
          [0.38, 1.3, 0],
          [0.38, 0.7, 0],
          [0.45, 0.4, 0.05],
          [0.8, 0.03, 0.15],
          [1.3, 0.03, 0.2],
        ],
        0.028,
        t.estano,
      );
      // Pegatina de protección (se quita al usarlo)
      const sello = new Mesh(
        new PlaneGeometry(0.62, 0.62),
        t.mat({ color: 0xf4f4f0, roughness: 0.6, side: DoubleSide }),
      );
      sello.rotation.x = -Math.PI / 2;
      sello.position.set(0, 2.262, 0);
      sello.scale.set(1, 1, 1);
      sello.visible = false;
      t.grupo.add(sello);
    },
  },

  // ---------------------------------------------------------------- ENERGÍA
  "portapilas-4xaa": {
    encuadre: { elevacion: 42, azimut: 30 },
    construir(t, o) {
      const negro = plastico(t, 0x171717, 0.55);
      t.caja(6.4, 0.15, 6.3, negro, 0, 0.075, 0);
      for (const z of [-3.08, 3.08]) t.caja(6.4, 1.4, 0.15, negro, 0, 0.7, z);
      for (const x of [-3.1, 3.1]) t.caja(0.2, 1.6, 6.3, negro, x, 0.8, 0);
      for (const z of [-1.5, 0, 1.5]) t.caja(5.8, 0.55, 0.1, negro, 0, 0.35, z);
      // Muelles y chapas de contacto (alternados, como las pilas)
      [-2.25, -0.75, 0.75, 2.25].forEach((z, i) => {
        const s = i % 2 === 0 ? 1 : -1;
        t.caja(0.06, 0.95, 0.95, t.acero, s * 2.95, 0.75, z);
        muelle(t, s * 2.92, 0.75, z, s === 1 ? -1 : 1, 0.42, 0.9);
        t.caja(0.06, 0.8, 0.8, t.acero, -s * 2.95, 0.72, z);
        t.cilindro(0.18, 0.06, t.acero, -s * 2.91, 0.72, z, "x", 20);
      });
      // Interruptor de encendido
      t.caja(0.3, 0.75, 1.3, t.plasticoNegro, -3.35, 0.8, 1.6);
      t.caja(0.22, 0.3, 0.4, t.mat({ color: 0x2a2a2a, roughness: 0.4 }), -3.55, 0.85, 1.75);
      if (!o?.modular)
        cablesAlimentacion(
          t,
          [
            [-3.2, 0.6, -2.5],
            [-3.9, 0.4, -2.6],
            [-4.6, 0.06, -1.6],
            [-4.9, 0.06, 0.4],
            [-4.5, 0.06, 2.4],
          ],
          0.08,
          0.18,
        );
    },
  },

  "bateria-18650-2s": {
    encuadre: { elevacion: 42, azimut: 30 },
    construir(t) {
      const negro = plastico(t, 0x171717, 0.55);
      t.caja(7.9, 0.15, 4.6, negro, 0, 0.075, 0);
      for (const x of [-3.83, 3.83]) t.caja(0.25, 2.1, 4.6, negro, x, 1.05, 0);
      for (const z of [-2.22, 2.22]) t.caja(7.4, 1.0, 0.16, negro, 0, 0.5, z);
      t.caja(7.4, 1.0, 0.16, negro, 0, 0.5, 0);
      [-1.1, 1.1].forEach((z, i) => {
        const s = i % 2 === 0 ? 1 : -1;
        t.caja(0.06, 1.5, 1.5, t.acero, s * 3.68, 1.1, z);
        muelle(t, s * 3.65, 1.1, z, s === 1 ? -1 : 1, 0.6, 1.1);
        t.caja(0.06, 1.3, 1.3, t.acero, -s * 3.68, 1.05, z);
        t.cilindro(0.3, 0.08, t.acero, -s * 3.63, 1.05, z, "x", 24);
      });
      cablesAlimentacion(
        t,
        [
          [-3.95, 0.6, -1.6],
          [-4.6, 0.4, -1.7],
          [-5.3, 0.08, -0.6],
          [-5.4, 0.08, 1.2],
          [-4.8, 0.08, 2.6],
        ],
        0.09,
        0.2,
      );
    },
  },

  // ---------------------------------------------------------------- ESTRUCTURAS
  "chasis-coche-2wd": {
    encuadre: { elevacion: 34, azimut: 22 },
    construir(t) {
      // La plancha de metacrilato (la misma forma que la del coche de la portada)
      const forma = new Shape();
      const [L, A, r] = [1.28, 0.6, 0.16];
      forma.moveTo(-L + r, -A);
      forma.lineTo(-0.83, -A);
      forma.lineTo(-0.83, -A + 0.12);
      forma.lineTo(-0.27, -A + 0.12);
      forma.lineTo(-0.27, -A);
      forma.lineTo(L - r, -A);
      forma.quadraticCurveTo(L, -A, L, -A + r);
      forma.lineTo(L, A - r);
      forma.quadraticCurveTo(L, A, L - r, A);
      forma.lineTo(-0.27, A);
      forma.lineTo(-0.27, A - 0.12);
      forma.lineTo(-0.83, A - 0.12);
      forma.lineTo(-0.83, A);
      forma.lineTo(-L + r, A);
      forma.quadraticCurveTo(-L, A, -L, A - r);
      forma.lineTo(-L, -A + r);
      forma.quadraticCurveTo(-L, -A, -L + r, -A);
      const ranura = (x: number, y: number, largo: number) => {
        const p = new Path();
        const rr = 0.025;
        p.moveTo(x - largo / 2, y - rr);
        p.lineTo(x + largo / 2, y - rr);
        p.absarc(x + largo / 2, y, rr, -Math.PI / 2, Math.PI / 2, false);
        p.lineTo(x - largo / 2, y + rr);
        p.absarc(x - largo / 2, y, rr, Math.PI / 2, (3 * Math.PI) / 2, false);
        forma.holes.push(p);
      };
      for (const y of [-0.42, 0.42]) {
        ranura(0.15, y, 0.3);
        ranura(0.75, y, 0.22);
      }
      ranura(-1.0, 0, 0.3);
      for (const [x, y] of [
        [1.1, -0.3],
        [1.1, 0.3],
        [0.35, 0],
        [-0.1, 0],
        [-0.55, -0.32],
        [-0.55, 0.32],
      ]) {
        const p = new Path();
        p.absarc(x, y, 0.03, 0, Math.PI * 2, true);
        forma.holes.push(p);
      }
      const metacrilato = t.fisico({
        color: 0xd2e1ec,
        roughness: 0.05,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        side: DoubleSide,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
      });
      const plancha = acrilico(t, forma, 0.04, metacrilato);
      plancha.rotation.x = -Math.PI / 2;
      plancha.position.y = 0.024;
      (plancha.children[0] as Mesh).castShadow = false;
      // Dos ruedas de pie, detrás
      rueda(t, -0.95, 0.385, 0.95, 0.5);
      rueda(t, -0.2, 0.385, 1.05, 0.5);
      // Rueda loca: soporte negro y bola de acero
      const negro = t.mat({ color: 0x1b1b1b, roughness: 0.6 });
      t.cilindro(0.075, 0.09, negro, 0.95, 0.045, 0.95, "y", 24, 0.09);
      t.caja(0.16, 0.03, 0.3, negro, 0.95, 0.105, 0.95);
      t.malla(
        new SphereGeometry(0.08, 24, 16),
        t.mat({ color: 0xe6e8ec, metalness: 1, roughness: 0.12 }),
        0.95,
        0.16,
        0.95,
      );
      // Separadores de latón, tornillos y tuercas sueltos
      for (const [x, z] of [
        [0.45, 1.05],
        [0.6, 1.15],
      ])
        t.cilindro(0.022, 0.26, t.laton, x, 0.022, z, "x", 12).rotation.y = 0.7;
      for (const [x, z] of [
        [1.3, 0.85],
        [1.4, 1.0],
        [1.25, 1.1],
      ])
        t.tuerca(x, 0, z, 0.03);
      // Las dos piezas negras que sujetan los motores
      for (const [x, z] of [
        [0.45, 0.75],
        [0.75, 0.8],
      ])
        t.caja(
          0.2,
          0.025,
          0.2,
          t.mat({ color: 0x1c1c1c, roughness: 0.4 }),
          x,
          0.0125,
          z,
        ).rotation.y = 0.3;
    },
  },

  "estructura-brazo-4dof": {
    encuadre: { elevacion: 22, azimut: 34, margen: 1.1 },
    construir(t) {
      const acr = t.fisico({
        color: 0x5f8fdc,
        roughness: 0.08,
        transparent: true,
        opacity: 0.72,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        side: DoubleSide,
      });
      const g = 0.3;
      // Base: dos planchas cuadradas separadas por columnas de latón
      for (const y of [0.15, 2.65]) {
        const p = acrilico(
          t,
          rectanguloRedondo(9, 9, 0.8, [
            [-3.8, -3.8, 0.15],
            [3.8, -3.8, 0.15],
            [-3.8, 3.8, 0.15],
            [3.8, 3.8, 0.15],
            [0, 0, 0.6],
          ]),
          g,
          acr,
        );
        p.rotation.x = -Math.PI / 2;
        p.position.y = y;
      }
      for (const [x, z] of [
        [-3.8, -3.8],
        [3.8, -3.8],
        [-3.8, 3.8],
        [3.8, 3.8],
      ]) {
        t.cilindro(0.18, 2.2, t.laton, x, 1.4, z, "y", 6);
        t.tornillo(x, 2.8, z, 0.22);
      }
      // Plato giratorio
      const plato = acrilico(t, rectanguloRedondo(6.4, 6.4, 3.2, [[0, 0, 0.3]]), g, acr);
      plato.rotation.x = -Math.PI / 2;
      plato.position.y = 3.15;
      // Hombro: dos laterales que sujetan el brazo
      for (const z of [-1.6, 1.6]) {
        const lado = acrilico(t, rectanguloRedondo(3.6, 4.4, 0.9, [[0, 1.2, 0.18]]), g, acr);
        lado.position.set(0, 5.5, z);
      }
      t.caja(3.4, 0.3, 3.5, acr, 0, 3.45, 0);
      // Brazo y antebrazo (cada uno con dos piezas, una a cada lado)
      const hombro: [number, number] = [0, 6.7];
      const a1 = (72 * Math.PI) / 180;
      const l1 = 8.5;
      const codo: [number, number] = [hombro[0] + l1 * Math.cos(a1), hombro[1] + l1 * Math.sin(a1)];
      const a2 = (-12 * Math.PI) / 180;
      const l2 = 9;
      const muneca: [number, number] = [codo[0] + l2 * Math.cos(a2), codo[1] + l2 * Math.sin(a2)];
      const eslabon = (
        desde: [number, number],
        angulo: number,
        largo: number,
        z: number,
        ancho = 1.3,
      ) => {
        const e = acrilico(t, estadio(largo, ancho, [0, largo / 2, largo], 0.15), g, acr);
        e.position.set(desde[0], desde[1], z);
        e.rotation.z = angulo;
      };
      for (const z of [-1.95, 1.95]) eslabon(hombro, a1, l1, z);
      for (const z of [-1.25, 1.25]) eslabon(codo, a2, l2, z, 1.1);
      // Varilla paralela (mantiene la pinza horizontal)
      eslabon([-1.2, 5.6], a1 + 0.05, l1 + 0.2, 0, 0.7);
      // Ejes con tornillo en cada articulación
      for (const [x, y, z] of [
        [hombro[0], hombro[1], 2.15],
        [codo[0], codo[1], 2.15],
        [codo[0], codo[1], 1.45],
        [muneca[0], muneca[1], 1.45],
      ] as const) {
        t.cilindro(0.24, 0.16, t.acero, x, y, z, "z", 24);
        t.caja(0.3, 0.06, 0.02, t.plasticoNegro, x, y, z + 0.09);
      }
      // Pinza: plataforma y dos dedos curvos
      const plataforma = acrilico(t, rectanguloRedondo(3.2, 3.0, 0.5, [[0, 0, 0.2]]), g, acr);
      plataforma.rotation.x = -Math.PI / 2;
      plataforma.position.set(muneca[0] + 1.2, muneca[1] - 0.2, 0);
      const dedo = new Shape();
      dedo.moveTo(0, -0.35);
      dedo.quadraticCurveTo(2.0, -0.6, 3.6, 0.15);
      dedo.lineTo(3.5, 0.45);
      dedo.quadraticCurveTo(2.0, 0.2, 0, 0.45);
      dedo.absarc(0, 0.05, 0.4, Math.PI / 2, (3 * Math.PI) / 2, false);
      for (const s of [-1, 1]) {
        const d = acrilico(t, dedo, g, acr);
        d.rotation.x = -Math.PI / 2;
        d.rotation.z = s * 0.22;
        d.scale.z = s; // el de un lado es la imagen en espejo del otro
        d.position.set(muneca[0] + 2.2, muneca[1] + 0.1, s * 0.75);
        t.tornillo(muneca[0] + 2.2, muneca[1] + 0.25, s * 0.75, 0.2);
      }
    },
  },

  "protoboard-cables": {
    encuadre: { elevacion: 40, azimut: 24 },
    construir(t, o) {
      const blanco = t.mat({ color: 0xeceae4, roughness: 0.7 });
      t.caja(
        8.3,
        0.85,
        5.5,
        t.caras(blanco, t.mat({ map: texturaProtoboard400(), roughness: 0.68 })),
        0,
        0.425,
        0,
      );
      // En los kits modulares las piezas se pinchan o se unen con imanes: sin cables
      if (o?.modular) return;
      // Posición de un agujero de la zona central (columna 0-29, fila 0-9)
      const agujero = (col: number, fila: number): [number, number] => [
        -4.15 + (130 + col * 48.5) / 200,
        -2.75 + (290 + fila * 50 + (fila >= 5 ? 70 : 0)) / 200,
      ];
      const colores = [
        0xd8262b, 0x1b1b1b, 0xf2c218, 0x26a65b, 0x3166ff, 0xff8a1f, 0x8e44ad, 0xe8e8e8, 0x8a5a3b,
        0x9aa0a6,
      ];
      const cableMat = colores.map((color) => t.mat({ color, roughness: 0.42 }));
      // Cables pinchados: arcos de un agujero a otro, con la funda negra de cada punta
      const pinchados: [number, number, number, number, number][] = [
        [3, 1, 12, 2, 0],
        [6, 7, 18, 8, 4],
        [15, 3, 24, 1, 3],
        [10, 6, 22, 6, 2],
      ];
      for (const [c1, f1, c2, f2, k] of pinchados) {
        const [x1, z1] = agujero(c1, f1);
        const [x2, z2] = agujero(c2, f2);
        const alto = 2.2 + Math.hypot(x2 - x1, z2 - z1) * 0.3;
        for (const [x, z] of [
          [x1, z1],
          [x2, z2],
        ])
          t.caja(0.25, 1.3, 0.25, t.plasticoNegro, x, 0.85 + 0.65, z);
        t.tubo(
          [
            [x1, 2.1, z1],
            [x1 + (x2 - x1) * 0.15, alto, z1 + (z2 - z1) * 0.15],
            [(x1 + x2) / 2, alto + 0.6, (z1 + z2) / 2],
            [x2 - (x2 - x1) * 0.15, alto, z2 - (z2 - z1) * 0.15],
            [x2, 2.1, z2],
          ],
          0.06,
          cableMat[k],
        );
      }
      // Un mazo de cables sueltos delante, en forma de U
      for (let i = 0; i < colores.length; i++) {
        const d = i * 0.13;
        const puntos: [number, number, number][] = [];
        for (let k = 0; k <= 16; k++) {
          const a = Math.PI * (k / 16);
          puntos.push([
            -3.2 + d + (k / 16) * 6.2,
            0.065,
            4.0 + d * 0.3 + Math.sin(a) * (1.0 + d * 0.4),
          ]);
        }
        t.tubo(puntos, 0.06, cableMat[i], 120);
        const [ax, , az] = puntos[0];
        const [bx, , bz] = puntos[16];
        t.caja(0.25, 0.25, 1.3, t.plasticoNegro, ax - 0.02, 0.125, az - 0.75);
        t.caja(0.25, 0.25, 1.3, t.plasticoNegro, bx + 0.02, 0.125, bz - 0.75);
        // Puntas macho (las hembra no llevan pin)
        if (i % 3 !== 2) t.caja(0.064, 0.064, 0.6, t.oro, ax - 0.02, 0.125, az - 1.7);
        if (i % 2 === 0) t.caja(0.064, 0.064, 0.6, t.oro, bx + 0.02, 0.125, bz - 1.7);
      }
    },
  },
};

/**
 * Coloca una pieza del configurador dentro de otra foto (para montar las de los kits), ya en su
 * versión modular. La pieza se construye con sus propias medidas; `escala` la ajusta a las de la foto.
 */
function colocar(
  padre: Group,
  slug: string,
  [x, y, z]: [number, number, number],
  {
    giro = 0,
    inclinacion = 0,
    escala = 1,
  }: { giro?: number; inclinacion?: number; escala?: number } = {},
) {
  const pieza = new Taller();
  MODELOS[slug].construir(pieza, { modular: true });
  pieza.grupo.position.set(x, y, z);
  pieza.grupo.rotation.set(inclinacion, giro, 0);
  pieza.grupo.scale.setScalar(escala);
  padre.add(pieza.grupo);
  return pieza.grupo;
}
// ------------------------------------------------------------------------------------
// Brazo robótico del kit (medidas en cm, pensado para servos MG996R)
// ------------------------------------------------------------------------------------
const E_MG = 1.75; // escala del MG996R respecto al SG90
const CARA_BOCINA = 3.4 * E_MG; // altura de la cara de la bocina, medida desde la base del servo
const EJE_SERVO = 0.55 * E_MG; // distancia del eje de salida al centro del cuerpo

function servoNegro(padre: Group) {
  const s = new Taller();
  MODELOS["servo-mg996r"].construir(s, { modular: true });
  padre.add(s.grupo);
  return s.grupo;
}

/**
 * Servo con el eje de salida en el origen del grupo, mirando a +z, la cara de la bocina en z = cara
 * y el cuerpo hacia el ángulo `hacia` (en el plano xy). Así cada articulación gira alrededor de z.
 */
function servoEnEje(padre: Group, cara: number, hacia: number) {
  const g = new Group();
  g.rotation.z = hacia;
  padre.add(g);
  const s = servoNegro(g);
  s.rotation.x = Math.PI / 2;
  s.position.set(EJE_SERVO, 0, cara - CARA_BOCINA);
  return g;
}

/** Plancha de metacrilato con un hueco rectangular (por donde pasa el cuerpo del servo) */
function placaConHueco(
  forma: Shape,
  [cx, cy, w, h]: [number, number, number, number],
  agujeros: [number, number, number][] = [],
) {
  const p = new Path();
  const r = 0.15;
  p.moveTo(cx - w / 2 + r, cy - h / 2);
  p.lineTo(cx - w / 2, cy - h / 2 + r);
  p.lineTo(cx - w / 2, cy + h / 2 - r);
  p.lineTo(cx - w / 2 + r, cy + h / 2);
  p.lineTo(cx + w / 2 - r, cy + h / 2);
  p.lineTo(cx + w / 2, cy + h / 2 - r);
  p.lineTo(cx + w / 2, cy - h / 2 + r);
  p.lineTo(cx + w / 2 - r, cy - h / 2);
  forma.holes.push(p);
  for (const [x, y, ra] of agujeros) {
    const c = new Path();
    c.absarc(x, y, ra, 0, Math.PI * 2, true);
    forma.holes.push(c);
  }
  return forma;
}

/** Eslabón: estadio de `largo` entre centros, con un agujero de radio propio en cada punto */
function eslabon(largo: number, ancho: number, agujeros: [number, number][]) {
  const s = estadio(largo, ancho);
  for (const [x, r] of agujeros) {
    const c = new Path();
    c.absarc(x, 0, r, 0, Math.PI * 2, true);
    s.holes.push(c);
  }
  return s;
}

/** Torre del hombro: rectángulo con la parte de arriba redonda (centro del arco en y = alto) */
function torre(ancho: number, alto: number) {
  const s = new Shape();
  s.moveTo(-ancho / 2, 0);
  s.lineTo(ancho / 2, 0);
  s.lineTo(ancho / 2, alto);
  s.absarc(0, alto, ancho / 2, 0, Math.PI, false);
  s.lineTo(-ancho / 2, 0);
  return s;
}

/** Separador de latón hexagonal entre dos puntos alineados con un eje */
function separador(
  t: Taller,
  padre: Group,
  x: number,
  y: number,
  z: number,
  largo: number,
  eje: "y" | "z",
) {
  t.cilindro(0.2, largo, t.laton, x, y, z, eje, 6, 0.2, padre);
}

/** Engranaje plano (para la pinza) */
function engranaje(t: Taller, padre: Group, x: number, y: number, z: number, material: Material) {
  t.cilindro(0.62, 0.3, material, x, y, z, "y", 40, 0.62, padre);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    t.caja(
      0.2,
      0.3,
      0.14,
      material,
      x + Math.cos(a) * 0.7,
      y,
      z + Math.sin(a) * 0.7,
      padre,
    ).rotation.y = -a;
  }
  t.cilindro(0.16, 0.34, t.acero, x, y, z, "y", 16, 0.16, padre);
}

function brazoMg996r(t: Taller) {
  const acr = t.fisico({
    color: 0x5f8fdc,
    roughness: 0.08,
    transparent: true,
    opacity: 0.72,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    side: DoubleSide,
  });
  const G = 0.3; // grosor del metacrilato
  const raiz = t.grupo;
  const horizontal = (forma: Shape, x: number, y: number, z: number, padre: Group = raiz) => {
    const p = acrilico(t, forma, G, acr, padre);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, y, z);
    return p;
  };
  const vertical = (forma: Shape, x: number, y: number, z: number, padre: Group = raiz) => {
    const p = acrilico(t, forma, G, acr, padre);
    p.position.set(x, y, z);
    return p;
  };

  // ---------- Base: tres planchas con columnas de latón; el servo de la base va dentro ----------
  const B = 12;
  const esquinas: [number, number][] = [
    [-5.2, -5.2],
    [5.2, -5.2],
    [-5.2, 5.2],
    [5.2, 5.2],
  ];
  const agujerosEsquinas = esquinas.map(([x, z]) => [x, -z, 0.17] as [number, number, number]);
  horizontal(rectanguloRedondo(B, B, 0.9, agujerosEsquinas), 0, 0.15, 0);
  horizontal(
    placaConHueco(rectanguloRedondo(B, B, 0.9), [EJE_SERVO, 0, 4.3, 2.35], agujerosEsquinas),
    0,
    3.31,
    0,
  );
  horizontal(rectanguloRedondo(B, B, 0.9, [...agujerosEsquinas, [0, 0, 0.6]]), 0, 5.75, 0);
  for (const [x, z] of esquinas) {
    separador(t, raiz, x, 1.73, z, 2.86, "y");
    separador(t, raiz, x, 4.53, z, 2.14, "y");
    t.tornillo(x, 5.9, z, 0.24);
  }
  const base = servoNegro(raiz);
  base.position.set(EJE_SERVO, 0.45, 0);

  // ---------- Plato giratorio (sobre la bocina del servo de la base) ----------
  const giro = new Group();
  giro.position.y = 6.4;
  giro.rotation.y = 0.12;
  raiz.add(giro);
  horizontal(
    rectanguloRedondo(
      8.8,
      8.8,
      4.4,
      Array.from({ length: 6 }, (_, k) => {
        const a = (k / 6) * Math.PI * 2;
        return [Math.cos(a) * 3.4, Math.sin(a) * 3.4, 0.15] as [number, number, number];
      }),
    ),
    0,
    0.15,
    0,
    giro,
  );

  // ---------- Hombro: dos torres que sujetan el servo (cuerpo hacia abajo, eje hacia +z) ----------
  const H = 10.1 - 6.4; // altura del eje del hombro sobre el plato
  const zFrente = -0.5;
  const zFondo = -4.0;
  vertical(
    placaConHueco(torre(5.2, H - 0.3), [0, H - 0.3 - 0.96, 2.4, 4.3]),
    0,
    0.3,
    zFrente,
    giro,
  );
  vertical(
    (() => {
      const f = torre(5.2, H - 0.3);
      const c = new Path();
      c.absarc(0, H - 0.3, 0.22, 0, Math.PI * 2, true);
      f.holes.push(c);
      return f;
    })(),
    0,
    0.3,
    zFondo,
    giro,
  );
  horizontal(rectanguloRedondo(5.2, 3.8, 0.3), 0, 0.45, (zFrente + zFondo) / 2, giro);
  const hombro = new Group();
  hombro.position.set(0, H, 0);
  giro.add(hombro);
  servoEnEje(hombro, 2.6, -Math.PI / 2);

  // ---------- Brazo: dos eslabones paralelos (uno en la bocina, otro en un eje libre detrás) ----------
  const L1 = 10.5;
  const a1 = (64 * Math.PI) / 180;
  const brazo = new Group();
  brazo.rotation.z = a1;
  hombro.add(brazo);
  vertical(
    eslabon(L1, 2.8, [
      [0, 0.22],
      [L1, 0.6],
    ]),
    0,
    0,
    2.75,
    brazo,
  );
  vertical(
    eslabon(L1, 2.8, [
      [0, 0.22],
      [L1, 0.22],
    ]),
    0,
    0,
    -4.45,
    brazo,
  );
  for (const y of [-0.85, 0.85]) separador(t, brazo, L1 * 0.42, y, -0.85, 6.9, "z");
  for (const x of [0, L1]) {
    t.cilindro(0.22, 0.75, t.acero, x, 0, -4.2, "z", 20, 0.22, brazo);
    t.cilindro(0.3, 0.12, t.acero, x, 0, -4.66, "z", 6, 0.3, brazo);
  }
  t.cilindro(0.18, 0.1, t.acero, 0, 0, 2.95, "z", 20, 0.18, brazo);

  // ---------- Codo: servo sujeto entre los dos eslabones, con el cuerpo hacia el hombro ----------
  const codo = new Group();
  codo.position.set(L1, 0, 0);
  brazo.add(codo);
  servoEnEje(codo, 3.25, Math.PI);
  // Calzo bajo el cuerpo del servo (hasta el eslabón de atrás)
  t.caja(3.8, 2.2, 1.55, acr, -EJE_SERVO, 0, -3.5, codo);

  // ---------- Antebrazo: en la bocina del codo, casi horizontal ----------
  const L2 = 8.5;
  const a2 = (-6 * Math.PI) / 180;
  const ante = new Group();
  ante.rotation.z = a2 - a1;
  codo.add(ante);
  vertical(eslabon(L2, 2.4, [[0, 0.18]]), 0, 0, 3.4, ante);
  t.cilindro(0.18, 0.1, t.acero, 0, 0, 3.6, "z", 20, 0.18, ante);
  // Nervio por debajo para que no se doble
  horizontal(rectanguloRedondo(L2 - 1.2, 1.6, 0.2), L2 / 2 + 0.2, -1.05, 2.45, ante);

  // ---------- Pinza: servo boca abajo sobre una plataforma y dos dedos con engranajes ----------
  const xPl = L2 + 1.35;
  const zPl = 1.125;
  const zEje = 0.35;
  horizontal(
    placaConHueco(rectanguloRedondo(5.1, 4.25, 0.5), [L2 + 1.44 - xPl, -(zEje - zPl), 4.3, 2.4]),
    xPl,
    -1.35,
    zPl,
    ante,
  );
  t.caja(1.2, 1.0, 0.3, acr, L2 - 0.3, -0.95, 3.1, ante); // escuadra entre antebrazo y plataforma
  const pinzaServo = servoNegro(ante);
  pinzaServo.rotation.z = Math.PI;
  pinzaServo.position.set(L2 + 1.44, -1.2 + 3.45, zEje);
  // Placa de abajo y engranajes
  const yEng = -3.95;
  separador(t, ante, L2 + 2.4, -2.95, 1.85, 2.9, "y");
  separador(t, ante, L2 + 0.2, -2.95, 2.6, 2.9, "y");
  separador(t, ante, L2 + 0.2, -2.95, -0.6, 2.9, "y");
  horizontal(rectanguloRedondo(4.2, 4.0, 0.5), L2 + 1.5, -4.55, zPl, ante);
  const blanco = t.mat({ color: 0xf3f3ef, roughness: 0.45 });
  engranaje(t, ante, L2 + 2.4, yEng, zEje, blanco);
  engranaje(t, ante, L2 + 2.4, yEng, zEje + 1.5, blanco);
  const dedo = new Shape();
  dedo.moveTo(0, -0.35);
  dedo.quadraticCurveTo(2.8, -0.75, 5.4, 0.15);
  dedo.lineTo(5.3, 0.5);
  dedo.quadraticCurveTo(2.8, 0.15, 0, 0.42);
  dedo.absarc(0, 0.035, 0.39, Math.PI / 2, (3 * Math.PI) / 2, false);
  for (const [z, s] of [
    [zEje, 1],
    [zEje + 1.5, -1],
  ] as const) {
    const d = acrilico(t, dedo, G, acr, ante);
    d.rotation.set(-Math.PI / 2, 0, s * 0.2);
    d.scale.y = s;
    d.position.set(L2 + 2.4, yEng - 0.3, z);
  }

  // ---------- Placa y pilas al lado, en sus bandejas, unidas a la base con imanes ----------
  const bandeja = (w: number, d: number, x: number, z: number) => {
    horizontal(rectanguloRedondo(w, d, 0.6), x, 0.15, z);
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      separador(t, raiz, x + sx * (w / 2 - 0.5), 0.55, z + sz * (d / 2 - 0.5), 0.5, "y");
  };
  // Imán con pines en la base (hembra) y en cada bandeja (macho), a 1,5 mm de encajar
  const union = (x: number, z: number, n: number, giroBase: number) => {
    conectorImantado(t, raiz, [x, 0.58, z], { n, macho: false, giro: giroBase });
    const d = 0.62;
    conectorImantado(t, raiz, [x + Math.cos(giroBase) * d, 0.58, z - Math.sin(giroBase) * d], {
      n,
      giro: giroBase + Math.PI,
    });
  };
  bandeja(8.0, 6.4, -10.7, 1.8);
  colocar(raiz, "arduino-uno-r3", [-10.8, 0.8, 1.8]);
  union(-6.25, 1.8, 6, Math.PI);
  bandeja(7.0, 7.0, 10.1, -2.6);
  colocar(raiz, "portapilas-4xaa", [10.1, 0.3, -2.6], { giro: Math.PI });
  union(6.25, -2.6, 2, 0);
}

/**
 * Fotos de los kits (ficha, listado y la imagen al compartir). El nombre es el slug del kit.
 * Medidas en centímetros, como las piezas.
 */
export const KITS: Record<string, Modelo> = {
  // El coche de la portada, montado
  "coche-seguidor-de-lineas": {
    encuadre: { elevacion: 22, azimut: 38, margen: 1.02 },
    construir(t) {
      t.grupo.add(crearModeloCoche().raiz);
    },
  },

  // Brazo antropomórfico de 4 grados de libertad con servos MG996R (base, hombro, codo y pinza),
  // con la placa y las pilas al lado, unidas a la base con conectores imantados
  "brazo-robotico": {
    encuadre: { elevacion: 18, azimut: 34, margen: 1.03 },
    construir(t) {
      brazoMg996r(t);
    },
  },

  // La estación modular: la ESP32 pinchada en la protoboard y cada sensor en su bandeja, que se
  // une a la protoboard con un conector imantado (sin cables)
  "estacion-meteorologica": {
    encuadre: { elevacion: 30, azimut: 26, margen: 1.03 },
    construir(t) {
      const raiz = t.grupo;
      colocar(raiz, "protoboard-cables", [0, 0, 0]);
      colocar(raiz, "esp32-devkit", [-0.9, 0.35, 0]);
      const bandejaMat = t.mat({ color: 0xeceae4, roughness: 0.7 });
      /**
       * Un sensor en su bandeja, pegado a un lado de la protoboard. `lado` = hacia dónde mira la
       * bandeja desde la protoboard (0 = +x, π/2 = -z, π = -x, -π/2 = +z); `a` = posición a lo largo del lado.
       */
      const modulo = (
        slug: string,
        lado: number,
        a: number,
        [w, d]: [number, number],
        giroPieza = 0,
        y = 0.3,
      ) => {
        const fuera: [number, number] = [Math.cos(lado), -Math.sin(lado)];
        const largo: [number, number] = [Math.sin(lado), Math.cos(lado)];
        // Borde de la protoboard en esa dirección
        const borde = Math.abs(fuera[0]) > 0.5 ? 4.15 : 2.75;
        const pos = (dist: number): [number, number] => [
          fuera[0] * dist + largo[0] * a,
          fuera[1] * dist + largo[1] * a,
        ];
        const [hx, hz] = pos(borde + 0.18);
        conectorImantado(t, raiz, [hx, 0.45, hz], {
          n: 4,
          macho: false,
          giro: lado,
        }).scale.setScalar(0.8);
        const [mx, mz] = pos(borde + 0.18 + 0.5);
        conectorImantado(t, raiz, [mx, 0.45, mz], { n: 4, giro: lado + Math.PI }).scale.setScalar(
          0.8,
        );
        const [cx, cz] = pos(borde + 0.95 + d / 2);
        const g = new Group();
        g.position.set(cx, 0, cz);
        g.rotation.y = lado;
        raiz.add(g);
        const b = acrilico(t, rectanguloRedondo(d, w, 0.35), 0.3, bandejaMat, g);
        b.rotation.x = -Math.PI / 2;
        b.position.y = 0.15;
        colocar(g, slug, [0, y, 0], { giro: giroPieza });
      };
      modulo("pantalla-oled-096", -Math.PI / 2, -2.1, [3.6, 3.4], Math.PI / 2);
      modulo("sensor-luz-ldr", -Math.PI / 2, 2.2, [3.8, 3.4], 0);
      modulo("sensor-presion-bmp280", 0, 0, [3.0, 2.6], Math.PI / 2);
      modulo("sensor-dht22", Math.PI / 2, 0.8, [3.2, 2.6], Math.PI / 2);
    },
  },
};
