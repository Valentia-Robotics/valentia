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
  texturaPantallaEstacion,
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

// ------------------------------------------------------------------------------------
// Brazo robótico del kit: carcasa impresa en 3D, negra mate, que esconde los servos MG996R.
// 6 articulaciones (base, hombro, codo, giro del antebrazo, muñeca y giro de la pinza) y pinza
// de dedos paralelos. La placa y las pilas van
// dentro de la base; delante, el USB, el interruptor y la luz de encendido. Medidas en cm.
// ------------------------------------------------------------------------------------
function brazoImpreso(t: Taller) {
  const raiz = t.grupo;
  // PLA negro mate, como una pieza impresa en 3D
  const cuerpo = t.fisico({
    color: 0x1d1e21,
    roughness: 0.66,
    clearcoat: 0.15,
    clearcoatRoughness: 0.7,
  });
  const tapaMat = t.fisico({ color: 0x232428, roughness: 0.6, clearcoat: 0.2 });
  const ranura = t.mat({ color: 0x08080a, roughness: 0.85 });
  const tornillo = t.mat({ color: 0xb4b7bd, roughness: 0.25, metalness: 1 });

  const grupo = (padre: Group, x: number, y: number, giro: number, z = 0) => {
    const g = new Group();
    g.position.set(x, y, z);
    g.rotation.z = giro;
    padre.add(g);
    return g;
  };

  /** Tornillo de cabeza redonda en la cara z = `z` (mirando hacia `s`) */
  const perno = (padre: Group, x: number, y: number, z: number, s: number, r = 0.1) => {
    t.cilindro(r, 0.06, tornillo, x, y, z + s * 0.03, "z", 20, r, padre);
    t.cilindro(r * 0.4, 0.02, ranura, x, y, z + s * 0.065, "z", 6, r * 0.4, padre);
  };

  /** Tambor de un servo (eje z, de z0 a z1) con los bordes redondeados */
  const tambor = (padre: Group, r: number, z0: number, z1: number, x = 0, y = 0) => {
    const b = Math.min(0.18, r * 0.16);
    const g = new LatheGeometry(
      [
        [0, z0],
        [r - b, z0],
        [r - b * 0.3, z0 + b * 0.3],
        [r, z0 + b],
        [r, z1 - b],
        [r - b * 0.3, z1 - b * 0.3],
        [r - b, z1],
        [0, z1],
      ].map(([a, h]) => new Vector2(a, h)),
      80,
    );
    g.rotateX(Math.PI / 2);
    return t.malla(g, cuerpo, x, y, 0, padre);
  };

  /** Pieza plana con extremos redondos (de x = 0 a x = largo), de z0 a z1, con cantos suaves */
  const placa = (
    padre: Group,
    largo: number,
    ancho: number,
    z0: number,
    z1: number,
    material: Material = cuerpo,
    x = 0,
  ) => {
    const bisel = Math.min(0.14, (z1 - z0) / 3);
    const g = new ExtrudeGeometry(estadio(largo, ancho - 2 * bisel), {
      depth: z1 - z0 - 2 * bisel,
      bevelEnabled: true,
      bevelSize: bisel,
      bevelThickness: bisel,
      bevelSegments: 4,
      curveSegments: 48,
    });
    g.translate(0, 0, z0 + bisel);
    return t.malla(g, material, x, 0, 0, padre);
  };

  /** Tapa atornillada sobre la cara de fuera de una articulación (eje en x = 0) */
  const tapa = (
    padre: Group,
    R: number,
    largo: number,
    z: number,
    s: number,
    tipo: "corona" | "esquinas",
  ) => {
    const z0 = s > 0 ? z : z - 0.16;
    placa(padre, largo, 2 * R, z0, z0 + 0.16, tapaMat, 0);
    const zc = z + s * 0.16;
    // Botón central con su agujero
    t.cilindro(R * 0.22, 0.08, tapaMat, 0, 0, zc + s * 0.04, "z", 32, R * 0.22, padre);
    t.cilindro(R * 0.08, 0.02, ranura, 0, 0, zc + s * 0.09, "z", 16, R * 0.08, padre);
    if (tipo === "corona")
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        perno(padre, Math.cos(a) * R * 0.48, Math.sin(a) * R * 0.48, zc, s, 0.085);
      }
    else
      for (const dy of [-1, 1]) perno(padre, largo + R * 0.45, dy * R * 0.62, zc, s, 0.085);
  };

  // ---------- Base: cuatro patas largas en cruz y una columna ----------
  for (let i = 0; i < 4; i++) {
    const forma = new Shape();
    forma.moveTo(0, -0.95);
    forma.lineTo(5.9, -0.42);
    forma.absarc(5.9, 0, 0.42, -Math.PI / 2, Math.PI / 2, false);
    forma.lineTo(0, 0.95);
    forma.lineTo(0, -0.95);
    const g = new ExtrudeGeometry(forma, {
      depth: 0.76,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.12,
      bevelSegments: 4,
      curveSegments: 24,
    });
    g.rotateX(-Math.PI / 2); // la extrusión pasa a ser la altura
    g.translate(0, 0.12, 0);
    // La pata baja hacia la punta
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = Math.max(0, p.getX(k));
      p.setY(k, p.getY(k) * Math.max(0.36, 1.0 - 0.105 * x));
    }
    g.computeVertexNormals();
    const pata = t.malla(g, cuerpo);
    pata.rotation.y = Math.PI / 4 + (i * Math.PI) / 2;
    // Juntura de impresión a media pata
    pata.add(t.caja(0.035, 0.74, 1.62, ranura, 3.0, 0.34, 0));
  }
  // Columna: cubo ancho y cuello que se ensancha hacia el hombro
  const torneado = (perfil: [number, number][], y: number) =>
    t.malla(new LatheGeometry(perfil.map(([r, h]) => new Vector2(r, h)), 96), cuerpo, 0, y, 0);
  torneado(
    [
      [0, 0],
      [1.95, 0],
      [2.1, 0.15],
      [2.1, 1.8],
      [1.98, 1.95],
      [0, 1.95],
    ],
    0,
  );
  t.cilindro(1.96, 0.06, ranura, 0, 1.98, 0, "y", 96); // el cuello gira sobre el cubo (1.ª articulación)
  torneado(
    [
      [0, 0],
      [1.9, 0],
      [1.9, 0.5],
      [1.7, 0.75],
      [1.55, 1.3],
      [1.6, 1.8],
      [1.8, 2.2],
      [0, 2.2],
    ],
    2.01,
  );
  t.cilindro(1.905, 0.05, ranura, 0, 2.45, 0, "y", 96);
  const yS = 5.1; // eje del hombro
  // Cuna del hombro: abraza el tambor por debajo
  t.redonda(2.3, 1.7, 3.0, 0.55, cuerpo, 0, 4.3, 0);

  // ---------- 2.ª articulación: hombro ----------
  tambor(raiz, 1.15, -1.55, 1.5, 0, yS);
  for (const z of [-0.5, 0.5]) t.cilindro(1.154, 0.04, ranura, 0, yS, z, "z", 80, 1.154);

  // ---------- Brazo (hombro → codo), pegado al lado del tambor ----------
  const L1 = 3.4;
  const brazo = grupo(raiz, 0, yS, 2.55);
  placa(brazo, L1, 2.1, 1.5, 2.95);
  t.cilindro(1.054, 0.04, ranura, 0, 0, 2.2, "z", 64, 1.054, brazo);
  tapa(brazo, 0.85, 0.45, 2.95, 1, "corona");
  tapa(grupo(brazo, L1, 0, Math.PI), 0.8, 0.45, 2.95, 1, "esquinas");

  // ---------- 3.ª articulación: codo y antebrazo ----------
  const L2 = 5.4;
  const antebrazo = grupo(brazo, L1, 0, 0.977 - 2.55);
  tambor(antebrazo, 1.05, -1.45, 1.5);
  t.cilindro(1.054, 0.04, ranura, 0, 0, 0, "z", 80, 1.054, antebrazo);
  // Bloque bajo (servo del codo y del giro del antebrazo)
  t.redonda(2.4, 2.05, 2.5, 0.6, cuerpo, 1.3, 0, 0.02, antebrazo);
  // 4.ª articulación: el antebrazo gira sobre sí mismo
  t.cilindro(0.98, 0.5, cuerpo, 2.78, 0, 0, "x", 64, 0.98, antebrazo);
  for (const x of [2.53, 3.03]) t.cilindro(0.984, 0.04, ranura, x, 0, 0, "x", 64, 0.984, antebrazo);
  t.redonda(1.3, 1.95, 2.35, 0.55, cuerpo, 3.68, 0, 0, antebrazo);
  // Placa lateral que llega hasta la muñeca
  placa(antebrazo, L2 - 3.5, 1.9, 1.17, 2.05, cuerpo, 3.5);
  t.cilindro(0.954, 0.035, ranura, L2, 0, 1.6, "z", 64, 0.954, antebrazo);

  // ---------- 5.ª articulación: muñeca (sube y baja) ----------
  const muneca = grupo(antebrazo, L2, 0, -1.15 - 0.977);
  tambor(muneca, 0.95, -0.35, 1.17);
  tambor(muneca, 0.95, -2.05, -0.45);
  t.cilindro(0.8, 0.12, cuerpo, 0, 0, -0.4, "z", 64, 0.8, muneca);
  // Tapa de la muñeca, por fuera de la placa del antebrazo
  tapa(grupo(antebrazo, L2, 0, Math.PI), 0.95, 1.0, 2.05, 1, "esquinas");

  // ---------- 6.ª articulación: gira la pinza ----------
  const zP = -1.15;
  t.redonda(1.1, 1.25, 1.4, 0.35, cuerpo, 1.05, 0, zP, muneca);
  t.cilindro(0.6, 0.32, tapaMat, 1.72, 0, zP, "x", 48, 0.6, muneca);
  t.cilindro(0.604, 0.03, ranura, 1.72, 0, zP, "x", 48, 0.604, muneca);

  // ---------- Pinza de dedos paralelos ----------
  const pinza = grupo(muneca, 1.88, 0, 0, zP);
  // Marco ancho donde se deslizan los dedos
  t.redonda(0.42, 3.2, 1.8, 0.14, cuerpo, 0.21, 0, 0, pinza);
  t.redonda(0.08, 2.75, 1.4, 0.03, ranura, 0.44, 0, 0, pinza);
  for (const s of [-1, 1]) t.cilindro(0.06, 2.6, tornillo, 0.52, 0, s * 0.45, "y", 12, 0.06, pinza);
  for (const s of [-1, 1]) {
    // Carro del dedo
    t.redonda(0.32, 0.85, 1.6, 0.1, tapaMat, 0.62, s * 0.95, 0, pinza);
    // Dedo grueso y plano, con la punta en bisel por fuera
    const L = 2.7;
    const e = 0.52;
    const perfil = new Shape();
    perfil.moveTo(0, 0);
    perfil.lineTo(L, 0);
    perfil.lineTo(L, e * 0.35);
    perfil.lineTo(L - 0.7, e);
    perfil.lineTo(0, e);
    perfil.lineTo(0, 0);
    const g = new ExtrudeGeometry(perfil, {
      depth: 1.3,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      bevelSegments: 3,
    });
    g.translate(0, 0, -0.65);
    const dedo = t.malla(g, cuerpo, 0.78, s * 0.5, 0, pinza);
    if (s < 0) dedo.rotation.x = Math.PI; // el otro dedo, dado la vuelta
  }
}

// ------------------------------------------------------------------------------------
// Caja de la estación meteorológica (medidas en cm)
// ------------------------------------------------------------------------------------
function cajaEstacion(t: Taller) {
  const raiz = t.grupo;
  const W = 8.6; // ancho (x)
  const D = 5.8; // fondo (z)
  const H = 1.9; // alto hasta la tapa
  const R = 0.8; // radio de las esquinas
  const carcasa = t.mat({
    color: 0xeae8e3,
    roughness: 0.62,
    bumpMap: texturaGrano(),
    bumpScale: 0.12,
  });
  /** Pieza de la caja: forma vista desde arriba, levantada `alto` desde y = desde */
  const pieza = (forma: Shape, desde: number, alto: number, material: Material, padre = raiz) => {
    const p = acrilico(t, forma, alto, material, padre);
    p.rotation.x = -Math.PI / 2;
    p.position.y = desde + alto / 2;
    (p.children[1] as LineSegments).visible = false;
    return p;
  };
  // Fondo macizo y paredes (hueca por dentro)
  pieza(rectanguloRedondo(W, D, R), 0, 0.4, carcasa);
  pieza(placaConHueco(rectanguloRedondo(W, D, R), [0, 0, W - 0.5, D - 0.5]), 0.4, H - 0.4, carcasa);
  // Tapa: pantalla grande a la izquierda y ventana ahumada a la derecha (se ve la placa)
  const pantalla: [number, number, number, number] = [-1.15, 0.15, 5.0, 3.0];
  const ventana: [number, number, number, number] = [2.85, 0.15, 1.9, 3.0];
  const tapa = placaConHueco(rectanguloRedondo(W, D, R), pantalla);
  placaConHueco(tapa, ventana);
  pieza(tapa, H, 0.16, carcasa);
  const cristal = t.fisico({
    color: 0x0b0c0f,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
  });
  t.caja(pantalla[2], 0.12, pantalla[3], cristal, pantalla[0], H + 0.07, -pantalla[1]);
  const imagen = new Mesh(
    new PlaneGeometry(pantalla[2] - 0.3, pantalla[3] - 0.3),
    t.mat({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveMap: texturaPantallaEstacion(),
      emissiveIntensity: 1.5,
      roughness: 0.1,
    }),
  );
  imagen.rotation.x = -Math.PI / 2;
  imagen.position.set(pantalla[0], H + 0.135, -pantalla[1]);
  raiz.add(imagen);
  const ahumado = t.fisico({
    color: 0x2a2f38,
    roughness: 0.06,
    transparent: true,
    opacity: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  t.caja(ventana[2], 0.1, ventana[3], ahumado, ventana[0], H + 0.08, -ventana[1]);
  // La ESP32 dentro: por la ventana se ve su módulo wifi
  colocar(raiz, "esp32-devkit", [0.55, 0.15, -ventana[1]]);

  // Delante: luz de encendido, USB-C e interruptor
  const frente = D / 2 + 0.1; // las paredes tienen un bisel de ~1 mm
  t.cilindro(
    0.07,
    0.05,
    t.mat({ color: 0x30d158, emissive: 0x30d158, emissiveIntensity: 1.6 }),
    1.05,
    1.0,
    frente + 0.02,
    "z",
    16,
  );
  t.redonda(0.9, 0.32, 0.08, 0.14, t.plasticoNegro, 2.0, 1.0, frente + 0.02);
  t.redonda(0.62, 0.1, 0.06, 0.04, t.acero, 2.0, 1.0, frente + 0.05);
  t.caja(1.2, 0.8, 0.06, t.plasticoNegro, 3.3, 1.0, frente + 0.02);
  const tecla = t.caja(0.95, 0.58, 0.2, plastico(t, 0x1c1c1e, 0.35), 3.3, 1.0, frente + 0.08);
  tecla.rotation.x = 0.22;
  t.caja(0.08, 0.2, 0.02, t.mat({ color: 0xf2f2f2, roughness: 0.4 }), 3.3, 1.1, frente + 0.19);

  /**
   * Un sensor en su cápsula, pegada a un lado de la caja (se une con imanes y pines pogo).
   * `lado` = hacia dónde sale (0 = +x, π/2 = -z, π = -x); `a` = posición a lo largo del lado.
   */
  const capsula = (
    slug: string,
    lado: number,
    a: number,
    [ancho, fondo, alto]: [number, number, number],
    giroPieza = 0,
  ) => {
    const g = new Group();
    const borde = Math.abs(Math.cos(lado)) > 0.5 ? W / 2 : D / 2;
    const dist = borde + 0.1 + fondo / 2;
    g.position.set(
      Math.cos(lado) * dist + Math.sin(lado) * a,
      0,
      -Math.sin(lado) * dist + Math.cos(lado) * a,
    );
    g.rotation.y = lado;
    raiz.add(g);
    pieza(rectanguloRedondo(fondo, ancho, 0.35), 0, alto, carcasa, g);
    // Junta oscura donde se pega a la caja (ahí están el imán y los pines)
    t.caja(
      0.04,
      alto * 0.55,
      ancho * 0.7,
      t.mat({ color: 0x2a2a2c, roughness: 0.5 }),
      -fondo / 2 - 0.02,
      alto * 0.45,
      0,
      g,
    );
    colocar(g, slug, [0, alto, 0], { giro: giroPieza });
  };
  capsula("sensor-luz-ldr", Math.PI, 0.3, [3.4, 3.4, 1.0], 0);
  capsula("sensor-presion-bmp280", 0, 0.6, [2.4, 2.2, 1.0], Math.PI / 2);
  capsula("sensor-dht22", Math.PI / 2, -2.2, [2.6, 2.2, 0.8], Math.PI / 2);
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

  // Brazo con carcasa impresa en 3D (negra mate) que esconde los servos; la electrónica va en la base
  "brazo-robotico": {
    encuadre: { elevacion: 6, azimut: 32, margen: 1.03 },
    construir(t) {
      brazoImpreso(t);
    },
  },

  // La estación en su caja: la ESP32 dentro (se ve por una ventana ahumada), la pantalla en la
  // tapa, interruptor y USB-C delante, y cada sensor pegado a un lado con un conector imantado
  "estacion-meteorologica": {
    encuadre: { elevacion: 30, azimut: 24, margen: 1.03 },
    construir(t) {
      cajaEstacion(t);
    },
  },
};
