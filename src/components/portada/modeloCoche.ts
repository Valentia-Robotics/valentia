/**
 * MODELO 3D DEL COCHE SEGUIDOR DE LÍNEAS (portada)
 * Las piezas reales del kit, hechas con formas sencillas y texturas dibujadas en canvas:
 * chasis de metacrilato, placa UNO, protoboard, driver L298N, dos motores TT amarillos con
 * sus ruedas, sensor de ultrasonidos HC-SR04, dos sensores de línea, portapilas 4×AA, conectores
 * imantados y cables JST.
 *
 * Medidas: 1 unidad ≈ 8,5 cm. El eje x apunta hacia delante (donde están los sensores),
 * y hacia arriba y z hacia los lados. El suelo está en y = SUELO.
 */
import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PiezaRobot } from "./piezasRobot";
import {
  texturaChip,
  texturaConector,
  texturaDibujoNeumatico,
  texturaDriver,
  texturaPila,
  texturaPlacaUno,
  texturaProtoboard,
  texturaRejilla,
  texturaSonar,
} from "./texturasRobot";

/** Altura del suelo (donde apoyan las ruedas) */
export const SUELO = -0.515;

/** Una pieza del despiece: su grupo 3D y sus materiales (para iluminarla) */
export interface PiezaModelo {
  grupo: Group;
  materiales: MeshStandardMaterial[];
}

export interface ModeloCoche {
  raiz: Group;
  piezas: Map<PiezaRobot["id"], PiezaModelo>;
  /** Los cables: se desvanecen al despiezar (no tienen sentido con las piezas separadas) */
  cables: { grupo: Group; materiales: MeshStandardMaterial[] };
  /** Libera la memoria de la tarjeta gráfica */
  liberar(): void;
}

type Opciones = ConstructorParameters<typeof MeshStandardMaterial>[0];

export function crearModeloCoche(): ModeloCoche {
  const geometrias: BufferGeometry[] = [];
  const materiales: Material[] = [];
  const texturas: Texture[] = [];
  const g = <T extends BufferGeometry>(geo: T) => (geometrias.push(geo), geo);
  const tx = <T extends Texture>(t: T) => (texturas.push(t), t);

  const geoTuerca = g(new CylinderGeometry(0.028, 0.028, 0.018, 6));
  const geoCabeza = g(new SphereGeometry(0.016, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2));

  const raiz = new Group();
  const piezas = new Map<PiezaRobot["id"], PiezaModelo>();

  /**
   * Herramientas para construir una pieza: cada pieza tiene sus propios materiales
   * (así, al iluminar la pieza de la que se habla, no se iluminan las demás).
   */
  function nuevaPieza(destino: PiezaModelo) {
    const mat = (opciones: Opciones, fisico = false) => {
      // Sin brillo propio de partida (la escena lo sube al hablar de esta pieza)
      const conBrillo = { emissiveIntensity: 0, ...opciones };
      const m = fisico ? new MeshPhysicalMaterial(conBrillo) : new MeshStandardMaterial(conBrillo);
      materiales.push(m);
      destino.materiales.push(m);
      return m;
    };
    const malla = (
      geo: BufferGeometry,
      material: Material | Material[],
      x = 0,
      y = 0,
      z = 0,
      padre: Group = destino.grupo,
    ) => {
      const m = new Mesh(geo, material);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      padre.add(m);
      return m;
    };
    /** Tuerca hexagonal con la cabeza del tornillo asomando (la tornillería de montaje) */
    let acero: MeshStandardMaterial | undefined;
    const tuerca = (x: number, y: number, z: number) => {
      acero ??= mat({ color: 0xbfc3c9, metalness: 1, roughness: 0.28 });
      malla(geoTuerca, acero, x, y + 0.009, z);
      malla(geoCabeza, acero, x, y + 0.022, z);
    };
    return { mat, malla, tuerca };
  }

  const crear = (id: PiezaRobot["id"]) => {
    const pieza: PiezaModelo = { grupo: new Group(), materiales: [] };
    raiz.add(pieza.grupo);
    piezas.set(id, pieza);
    return { pieza, ...nuevaPieza(pieza) };
  };

  /** Materiales de cara de arriba con textura: [+x, -x, +y, -y, +z, -z] de BoxGeometry */
  const caras = (lado: Material, arriba: Material) => [lado, lado, arriba, lado, lado, lado];

  // ------------------------------------------------------------------
  // CHASIS: placa de metacrilato transparente con ranuras y la rueda loca
  // ------------------------------------------------------------------
  {
    const { pieza, mat, malla, tuerca } = crear("chasis");
    const forma = new Shape();
    const [L, A, r] = [1.28, 0.6, 0.16]; // medio largo, medio ancho, radio de las esquinas
    forma.moveTo(-L + r, -A);
    // Lado con los huecos de las ruedas (en x = -0.55)
    const hueco = (lado: 1 | -1) => [-0.83, -0.27].map((x) => [x, lado * (A - 0.12)] as const);
    forma.lineTo(-0.83, -A);
    forma.lineTo(...hueco(-1)[0]);
    forma.lineTo(...hueco(-1)[1]);
    forma.lineTo(-0.27, -A);
    forma.lineTo(L - r, -A);
    forma.quadraticCurveTo(L, -A, L, -A + r);
    forma.lineTo(L, A - r);
    forma.quadraticCurveTo(L, A, L - r, A);
    forma.lineTo(-0.27, A);
    forma.lineTo(...hueco(1)[1]);
    forma.lineTo(...hueco(1)[0]);
    forma.lineTo(-0.83, A);
    forma.lineTo(-L + r, A);
    forma.quadraticCurveTo(-L, A, -L, A - r);
    forma.lineTo(-L, -A + r);
    forma.quadraticCurveTo(-L, -A, -L + r, -A);
    // Ranuras y agujeros de montaje (como los de los chasis cortados con láser)
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
    ]) {
      const p = new Path();
      p.absarc(x, y, 0.03, 0, Math.PI * 2, true);
      forma.holes.push(p);
    }
    const geo = g(
      new ExtrudeGeometry(forma, {
        depth: 0.04,
        bevelEnabled: true,
        bevelThickness: 0.004,
        bevelSize: 0.004,
        bevelSegments: 1,
        curveSegments: 10,
      }),
    );
    geo.rotateX(-Math.PI / 2); // la forma pasa a estar tumbada: grosor hacia arriba
    const metacrilato = mat(
      {
        color: 0xe4eef4,
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: DoubleSide,
      },
      true,
    ) as MeshPhysicalMaterial;
    // Capa brillante por encima: refleja la luz como el metacrilato de verdad
    metacrilato.clearcoat = 1;
    metacrilato.clearcoatRoughness = 0.03;
    const chapa = malla(geo, metacrilato, 0, -0.02, 0);
    chapa.castShadow = false;
    // Cantos del metacrilato, que brillan un poco
    const cantos = new LineSegments(
      g(new EdgesGeometry(geo, 30)),
      new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
    );
    materiales.push(cantos.material);
    cantos.position.y = -0.02;
    pieza.grupo.add(cantos);

    // Tornillería de la rueda loca y del soporte de los motores
    for (const z of [-0.09, 0.09]) tuerca(0.92, 0.02, z);
    for (const [x, z] of [
      [-0.67, -0.32],
      [-0.43, -0.32],
      [-0.67, 0.32],
      [-0.43, 0.32],
    ])
      tuerca(x, 0.02, z);
    // Rueda loca delantera: dos separadores de latón, soporte y bola de acero
    const laton = mat({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3 });
    const separador = g(new CylinderGeometry(0.022, 0.022, 0.26, 12));
    malla(separador, laton, 0.92, -0.15, -0.09);
    malla(separador, laton, 0.92, -0.15, 0.09);
    const negro = mat({ color: 0x1b1b1b, roughness: 0.6 });
    malla(g(new RoundedBoxGeometry(0.16, 0.03, 0.3, 2, 0.01)), negro, 0.92, -0.29, 0);
    malla(g(new CylinderGeometry(0.075, 0.09, 0.09, 24)), negro, 0.92, -0.35, 0);
    malla(
      g(new SphereGeometry(0.08, 24, 16)),
      mat({ color: 0xe6e8ec, metalness: 1, roughness: 0.12 }),
      0.92,
      SUELO + 0.08,
      0,
    );
  }

  // ------------------------------------------------------------------
  // PLACA: el «cerebro» (placa UNO sobre separadores) y la protoboard
  // ------------------------------------------------------------------
  {
    const { mat, malla, tuerca } = crear("placa");
    const cx = 0.38;
    const cz = -0.26;
    const y = 0.085; // cara de arriba de la placa
    const pcbLado = mat({ color: 0x0c5d77, roughness: 0.6 });
    const pcbArriba = mat({ map: tx(texturaPlacaUno()), roughness: 0.55 });
    malla(g(new BoxGeometry(0.81, 0.016, 0.63)), caras(pcbLado, pcbArriba), cx, y - 0.008, cz);
    const laton = mat({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3 });
    const sep = g(new CylinderGeometry(0.018, 0.018, 0.07, 10));
    for (const [dx, dz] of [
      [-0.34, -0.25],
      [0.34, -0.25],
      [-0.34, 0.25],
      [0.34, 0.25],
    ])
      malla(sep, laton, cx + dx, 0.04, cz + dz);
    for (const [dx, dz] of [
      [-0.34, -0.25],
      [0.34, -0.25],
      [-0.34, 0.25],
      [0.34, 0.25],
    ])
      tuerca(cx + dx, y - 0.004, cz + dz);

    // Conector USB (metálico) y conector de alimentación (negro), en el borde de atrás
    const metal = mat({ color: 0xc8ccd2, metalness: 0.95, roughness: 0.22 });
    malla(g(new BoxGeometry(0.2, 0.12, 0.15)), metal, cx - 0.37, y + 0.06, cz + 0.17);
    const plastico = mat({ color: 0x141414, roughness: 0.5 });
    malla(g(new BoxGeometry(0.18, 0.12, 0.11)), plastico, cx - 0.36, y + 0.06, cz - 0.2);

    // Tiras de conectores hembra a lo largo de los dos bordes
    const agujeros = tx(texturaConector());
    agujeros.repeat.set(16, 1);
    const tiraArriba = mat({ map: agujeros, roughness: 0.6 });
    const tiraLado = mat({ color: 0x151515, roughness: 0.6 });
    malla(
      g(new BoxGeometry(0.62, 0.09, 0.03)),
      caras(tiraLado, tiraArriba),
      cx + 0.06,
      y + 0.045,
      cz + 0.29,
    );
    const agujeros2 = tx(texturaConector());
    agujeros2.repeat.set(14, 1);
    malla(
      g(new BoxGeometry(0.52, 0.09, 0.03)),
      caras(tiraLado, mat({ map: agujeros2, roughness: 0.6 })),
      cx + 0.1,
      y + 0.045,
      cz - 0.29,
    );

    // Microcontrolador en su zócalo, con sus patas
    const chip = mat({ map: tx(texturaChip("ATMEGA328P")), roughness: 0.45 });
    malla(
      g(new BoxGeometry(0.42, 0.045, 0.1)),
      caras(mat({ color: 0x141414, roughness: 0.45 }), chip),
      cx + 0.14,
      y + 0.04,
      cz - 0.12,
    );
    malla(g(new BoxGeometry(0.44, 0.015, 0.13)), plastico, cx + 0.14, y + 0.01, cz - 0.12);
    const pata = g(new BoxGeometry(0.012, 0.03, 0.018));
    for (let i = 0; i < 14; i++) {
      const px = cx + 0.14 - 0.19 + i * 0.029;
      malla(pata, metal, px, y + 0.025, cz - 0.12 + 0.058);
      malla(pata, metal, px, y + 0.025, cz - 0.12 - 0.058);
    }
    // Cristal, condensadores, botón de reinicio, chip USB y pines ICSP
    malla(
      g(new RoundedBoxGeometry(0.08, 0.03, 0.035, 2, 0.012)),
      metal,
      cx - 0.08,
      y + 0.015,
      cz - 0.03,
    );
    const condensador = g(new CylinderGeometry(0.03, 0.03, 0.07, 18));
    malla(condensador, metal, cx - 0.22, y + 0.035, cz - 0.04);
    malla(condensador, metal, cx - 0.22, y + 0.035, cz - 0.11);
    malla(g(new BoxGeometry(0.05, 0.03, 0.05)), metal, cx - 0.3, y + 0.015, cz + 0.02);
    malla(
      g(new CylinderGeometry(0.015, 0.015, 0.02, 12)),
      mat({ color: 0xd8c9a8 }),
      cx - 0.3,
      y + 0.035,
      cz + 0.02,
    );
    malla(g(new BoxGeometry(0.07, 0.015, 0.07)), plastico, cx - 0.18, y + 0.008, cz + 0.12);
    const pin = g(new BoxGeometry(0.012, 0.07, 0.012));
    const dorado = mat({ color: 0xd8b65a, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++)
        malla(pin, dorado, cx + 0.36 - j * 0.03, y + 0.035, cz + i * 0.03 - 0.03);
    // Luz de encendido (verde)
    malla(
      g(new BoxGeometry(0.02, 0.012, 0.012)),
      mat({ color: 0x5dff7a, emissive: 0x2bff55, emissiveIntensity: 1.5 }),
      cx + 0.27,
      y + 0.006,
      cz - 0.04,
    );

    // Protoboard pequeña, delante a la derecha
    const proto = mat({ map: tx(texturaProtoboard()), roughness: 0.75 });
    const protoLado = mat({ color: 0xeceae5, roughness: 0.75 });
    malla(
      g(new BoxGeometry(0.54, 0.085, 0.4)),
      caras(protoLado, proto),
      0.78,
      0.0425 + 0.002,
      0.32,
    );
  }

  // ------------------------------------------------------------------
  // MOTORES: dos motores TT amarillos, sus ruedas y el driver L298N
  // ------------------------------------------------------------------
  {
    const { mat, malla, tuerca } = crear("motores");
    const ejeX = -0.55;
    const ejeY = -0.135;
    const amarillo = mat({ color: 0xe9b910, roughness: 0.38 });
    const metal = mat({ color: 0xc3c7cd, metalness: 0.95, roughness: 0.25 });
    const blanco = mat({ color: 0xf1f1ec, roughness: 0.5 });
    const tapaMotor = mat({ color: 0x2a2a2a, roughness: 0.6 });
    const dibujo = tx(texturaDibujoNeumatico());
    const goma = mat({ color: 0x1e1e1e, roughness: 0.88, bumpMap: dibujo, bumpScale: 1.2 });
    const llanta = mat({ color: 0xe9b910, roughness: 0.36 });
    const hueco = mat({ color: 0x0d0d0d, roughness: 0.8 });
    const caja = g(new RoundedBoxGeometry(0.46, 0.22, 0.19, 3, 0.025));
    const lata = g(new CylinderGeometry(0.095, 0.095, 0.24, 28));
    const eje = g(new CylinderGeometry(0.022, 0.022, 0.3, 12));
    const neumatico = g(new TorusGeometry(0.3, 0.085, 24, 96));
    const reborde = g(new TorusGeometry(0.255, 0.018, 10, 64));
    const agujero = g(new CylinderGeometry(0.024, 0.024, 0.2, 14));
    const disco = g(new CylinderGeometry(0.255, 0.255, 0.07, 40));
    const radio = g(new BoxGeometry(0.04, 0.42, 0.075));
    const buje = g(new CylinderGeometry(0.06, 0.06, 0.12, 20));
    for (const lado of [-1, 1]) {
      const z = lado * 0.45;
      // Caja reductora amarilla: el eje de la rueda sale cerca de un extremo
      malla(caja, amarillo, ejeX + 0.12, ejeY, z);
      // Los dos agujeros pasantes de los motores TT
      for (const dxh of [0.2, 0.29])
        malla(agujero, hueco, ejeX + dxh, ejeY - 0.04, z).rotation.x = Math.PI / 2;
      // Motor (lata metálica) que sale hacia el centro del coche
      malla(lata, metal, ejeX + 0.47, ejeY, z).rotation.z = Math.PI / 2;
      malla(
        g(new CylinderGeometry(0.085, 0.085, 0.03, 24)),
        tapaMotor,
        ejeX + 0.6,
        ejeY,
        z,
      ).rotation.z = Math.PI / 2;
      malla(eje, blanco, ejeX, ejeY, z + lado * 0.12).rotation.x = Math.PI / 2;
      // Rueda: neumático negro, llanta amarilla con radios y buje
      const zr = lado * 0.74;
      malla(neumatico, goma, ejeX, ejeY, zr);
      const d = malla(disco, llanta, ejeX, ejeY, zr);
      d.rotation.x = Math.PI / 2;
      d.scale.set(1, 0.6, 1);
      for (let k = 0; k < 3; k++) {
        const rr = malla(radio, llanta, ejeX, ejeY, zr + lado * 0.03);
        rr.rotation.z = (k * Math.PI) / 3;
      }
      malla(buje, llanta, ejeX, ejeY, zr).rotation.x = Math.PI / 2;
      malla(reborde, llanta, ejeX, ejeY, zr + lado * 0.035);
      // Tornillo central de la rueda
      malla(
        g(new CylinderGeometry(0.02, 0.02, 0.13, 12)),
        mat({ color: 0xbfc3c9, metalness: 1, roughness: 0.3 }),
        ejeX,
        ejeY,
        zr,
      ).rotation.x = Math.PI / 2;
      // Sujeción de metacrilato que une el motor al chasis
      malla(
        g(new BoxGeometry(0.2, 0.2, 0.025)),
        mat({ color: 0x1c1c1c, roughness: 0.4 }),
        ejeX + 0.12,
        ejeY + 0.02,
        z - lado * 0.11,
      );
    }

    // Driver L298N encima del chasis, atrás a la derecha
    const dx = -0.5;
    const dz = 0.33;
    const y = 0.075;
    const rojoLado = mat({ color: 0x9e0f17, roughness: 0.6 });
    const rojoArriba = mat({ map: tx(texturaDriver()), roughness: 0.55 });
    malla(g(new BoxGeometry(0.5, 0.016, 0.5)), caras(rojoLado, rojoArriba), dx, y - 0.008, dz);
    const laton = mat({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3 });
    const sep = g(new CylinderGeometry(0.016, 0.016, 0.06, 10));
    for (const [a, b] of [
      [-0.21, -0.21],
      [0.21, -0.21],
      [-0.21, 0.21],
      [0.21, 0.21],
    ])
      malla(sep, laton, dx + a, 0.035, dz + b);
    for (const [a, b] of [
      [-0.21, -0.21],
      [0.21, -0.21],
      [-0.21, 0.21],
      [0.21, 0.21],
    ])
      tuerca(dx + a, y - 0.004, dz + b);
    // Disipador negro con aletas
    const aluminio = mat({ color: 0x1e1f22, metalness: 0.6, roughness: 0.45 });
    malla(g(new BoxGeometry(0.26, 0.04, 0.17)), aluminio, dx + 0.02, y + 0.02, dz - 0.04);
    const aleta = g(new BoxGeometry(0.26, 0.26, 0.012));
    for (let i = 0; i < 8; i++) malla(aleta, aluminio, dx + 0.02, y + 0.17, dz - 0.115 + i * 0.022);
    // Bornes azules con sus tornillos
    const azul = mat({ color: 0x1f5fd6, roughness: 0.45 });
    const tornillo = g(new CylinderGeometry(0.022, 0.022, 0.015, 16));
    const borne = (x: number, z: number, n: number, girado: boolean) => {
      const largo = 0.075 * n;
      malla(
        g(new BoxGeometry(girado ? largo : 0.08, 0.08, girado ? 0.08 : largo)),
        azul,
        x,
        y + 0.04,
        z,
      );
      for (let i = 0; i < n; i++) {
        const o = -largo / 2 + 0.0375 + i * 0.075;
        malla(tornillo, metal, girado ? x + o : x, y + 0.087, girado ? z : z + o);
      }
    };
    borne(dx - 0.2, dz - 0.07, 2, false);
    borne(dx + 0.2, dz - 0.07, 2, false);
    borne(dx, dz + 0.2, 3, true);
    // Condensador grande y pines de control
    malla(
      g(new CylinderGeometry(0.045, 0.045, 0.13, 20)),
      mat({ color: 0x1b2a55, roughness: 0.35 }),
      dx - 0.13,
      y + 0.065,
      dz + 0.1,
    );
    const pinD = g(new BoxGeometry(0.012, 0.07, 0.012));
    const dorado = mat({ color: 0xd8b65a, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < 6; i++) malla(pinD, dorado, dx + 0.06 + i * 0.025, y + 0.035, dz + 0.1);
  }

  // ------------------------------------------------------------------
  // SENSORES: ultrasonidos HC-SR04 delante y dos sensores de línea debajo
  // ------------------------------------------------------------------
  {
    const { mat, malla, tuerca } = crear("sensores");
    const x = 1.2;
    const y = 0.2;
    // Soporte negro en L atornillado al chasis
    const negro = mat({ color: 0x161616, roughness: 0.55 });
    malla(g(new BoxGeometry(0.14, 0.02, 0.3)), negro, x - 0.07, 0.01, 0);
    malla(g(new BoxGeometry(0.02, 0.14, 0.3)), negro, x - 0.01, 0.08, 0);
    for (const z of [-0.09, 0.09]) tuerca(x - 0.09, 0.02, z);
    // Placa azul vertical (mirando hacia delante)
    const azulLado = mat({ color: 0x113d85, roughness: 0.6 });
    const azulCara = mat({ map: tx(texturaSonar()), roughness: 0.55 });
    const pcb = malla(
      g(new BoxGeometry(0.53, 0.016, 0.24)),
      caras(azulLado, azulCara),
      x + 0.01,
      y,
      0,
    );
    pcb.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    // Los dos «ojos»: cilindros metálicos con rejilla en la cara
    const plata = mat({ color: 0xd3d6db, metalness: 0.95, roughness: 0.22 });
    const rejilla = mat({ map: tx(texturaRejilla()), metalness: 0.5, roughness: 0.5 });
    const ojo = g(new CylinderGeometry(0.095, 0.095, 0.13, 36));
    for (const z of [-0.135, 0.135]) {
      const m = malla(ojo, [plata, rejilla, plata], x + 0.085, y, z);
      m.rotation.z = -Math.PI / 2;
    }
    // Cristal entre los ojos y pines abajo
    malla(g(new RoundedBoxGeometry(0.02, 0.04, 0.09, 2, 0.01)), plata, x + 0.025, y + 0.07, 0);
    const pin = g(new BoxGeometry(0.012, 0.08, 0.012));
    const dorado = mat({ color: 0xd8b65a, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < 4; i++) malla(pin, dorado, x + 0.005, y - 0.15, -0.045 + i * 0.03);

    // Sensores de línea (debajo, mirando al suelo)
    const placaLinea = mat({ color: 0x1a2f6d, roughness: 0.6 });
    const emisor = mat({ color: 0x2a6bff, roughness: 0.15, transparent: true, opacity: 0.85 });
    const receptor = mat({ color: 0x0c0c0c, roughness: 0.2 });
    const potenciometro = mat({ color: 0x2f62d8, roughness: 0.4 });
    for (const z of [-0.16, 0.16]) {
      malla(g(new BoxGeometry(0.32, 0.016, 0.13)), placaLinea, 1.02, -0.11, z);
      malla(
        g(new CylinderGeometry(0.016, 0.016, 0.08, 10)),
        mat({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3 }),
        1.02,
        -0.06,
        z,
      );
      malla(g(new BoxGeometry(0.08, 0.05, 0.11)), negro, 1.14, -0.145, z);
      malla(g(new SphereGeometry(0.022, 14, 10)), emisor, 1.14, -0.175, z - 0.028);
      malla(g(new SphereGeometry(0.022, 14, 10)), receptor, 1.14, -0.175, z + 0.028);
      malla(g(new BoxGeometry(0.05, 0.05, 0.05)), potenciometro, 0.95, -0.075, z);
    }
  }

  // ------------------------------------------------------------------
  // BATERÍA: portapilas negro con cuatro pilas AA, atrás a la izquierda
  // ------------------------------------------------------------------
  {
    const { mat, malla } = crear("bateria");
    const bx = -0.62;
    const bz = -0.3;
    const negro = mat({ color: 0x141414, roughness: 0.55 });
    malla(g(new BoxGeometry(0.72, 0.02, 0.64)), negro, bx, 0.01, bz);
    const pared = g(new BoxGeometry(0.72, 0.1, 0.02));
    malla(pared, negro, bx, 0.06, bz - 0.31);
    malla(pared, negro, bx, 0.06, bz + 0.31);
    const testa = g(new BoxGeometry(0.03, 0.12, 0.64));
    malla(testa, negro, bx - 0.345, 0.07, bz);
    malla(testa, negro, bx + 0.345, 0.07, bz);
    // Pilas: envoltorio impreso (cuerpo oscuro, franja cobre y texto) y extremos metálicos
    const envoltorio = mat({ map: tx(texturaPila()), metalness: 0.3, roughness: 0.32 });
    const acero = mat({ color: 0xcfd2d6, metalness: 1, roughness: 0.2 });
    const cuerpo = g(new CylinderGeometry(0.072, 0.072, 0.58, 40, 1, true));
    const tapa = g(new CylinderGeometry(0.07, 0.07, 0.01, 28));
    const polo = g(new CylinderGeometry(0.025, 0.025, 0.03, 16));
    for (let i = 0; i < 4; i++) {
      const z = bz - 0.225 + i * 0.15;
      const sentido = i % 2 === 0 ? 1 : -1; // alternadas, como en un portapilas de verdad
      // rotation.z = -π/2 lleva la parte de arriba del cilindro (la franja cobre) hacia +x
      const pila = malla(cuerpo, envoltorio, bx, 0.095, z);
      pila.rotation.z = -sentido * (Math.PI / 2);
      pila.rotation.x = 0.6;
      malla(tapa, acero, bx + sentido * 0.29, 0.095, z).rotation.z = Math.PI / 2;
      malla(tapa, acero, bx - sentido * 0.29, 0.095, z).rotation.z = Math.PI / 2;
      malla(polo, acero, bx + sentido * 0.305, 0.095, z).rotation.z = Math.PI / 2;
    }
  }

  // ------------------------------------------------------------------
  // CONEXIONES. Los kits Valentia son modulares: las piezas se unen con imanes y pines pogo
  // (conectores negros con pines dorados) y solo lo que no se puede imantar (motores, pilas y
  // el driver, que va lejos de la placa) lleva cables cortos con conectores JST blancos.
  // Todo esto se desvanece al despiezar.
  // ------------------------------------------------------------------
  const cables = { grupo: new Group(), materiales: [] as MeshStandardMaterial[] };
  raiz.add(cables.grupo);
  {
    const material = (opciones: Opciones) => {
      const m = new MeshStandardMaterial(opciones);
      materiales.push(m);
      cables.materiales.push(m);
      return m;
    };
    const malla = (geo: BufferGeometry, m: Material, x: number, y: number, z: number) => {
      const o = new Mesh(geo, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      cables.grupo.add(o);
      return o;
    };
    const colores = new Map<number, MeshStandardMaterial>();
    const cable = (color: number, puntos: [number, number, number][]) => {
      let m = colores.get(color);
      if (!m) {
        m = material({ color, roughness: 0.45 });
        colores.set(color, m);
      }
      const curva = new CatmullRomCurve3(
        puntos.map((p) => new Vector3(...p)),
        false,
        "centripetal",
      );
      malla(g(new TubeGeometry(curva, 64, 0.0075, 8, false)), m, 0, 0, 0);
    };
    // Conector JST blanco, de `ancho` (según los cables que lleva), girado `giro` alrededor de y
    const blanco = material({ color: 0xf1eee4, roughness: 0.5 });
    const jst = (x: number, y: number, z: number, ancho: number, giro = 0) => {
      malla(g(new BoxGeometry(0.045, 0.05, ancho)), blanco, x, y, z).rotation.y = giro;
    };
    // Conector imantado: carcasa negra, pines dorados y un imán en cada punta (a lo largo de `eje`)
    const negro = material({ color: 0x151515, roughness: 0.45 });
    const oro = material({ color: 0xd9b25a, metalness: 1, roughness: 0.25 });
    const iman = material({ color: 0xc9ccd2, metalness: 0.9, roughness: 0.25 });
    const geoPin = g(new CylinderGeometry(0.0055, 0.0055, 0.006, 10));
    const geoIman = g(new CylinderGeometry(0.011, 0.011, 0.005, 16));
    const imantado = (x: number, y: number, z: number, n: number, eje: "x" | "z") => {
      const largo = 0.025 * n + 0.05;
      const enX = eje === "x";
      malla(g(new BoxGeometry(enX ? largo : 0.04, 0.03, enX ? 0.04 : largo)), negro, x, y, z);
      const punto = (d: number): [number, number] => (enX ? [x + d, z] : [x, z + d]);
      for (let i = 0; i < n; i++) {
        const [px, pz] = punto((i - (n - 1) / 2) * 0.025);
        malla(geoPin, oro, px, y + 0.017, pz);
      }
      for (const s of [-1, 1]) {
        const [px, pz] = punto(s * (largo / 2 - 0.014));
        malla(geoIman, iman, px, y + 0.016, pz);
      }
    };

    const R = 0xd8262b;
    const N = 0x1b1b1b;
    // Placa UNO ↔ protoboard, ultrasonidos ↔ chasis y sensores de línea ↔ chasis: con imanes
    imantado(0.62, 0.1, 0.08, 4, "x");
    imantado(1.02, 0.02, 0, 4, "z");
    for (const z of [-0.16, 0.16]) imantado(0.9, -0.035, z, 3, "x");

    // Placa UNO → entradas del driver: cinta de 4 cables con un JST en cada punta
    [0xff8a1f, 0xf2c218, 0x26a65b, 0x3166ff].forEach((color, i) => {
      const x = 0.32 + i * 0.016;
      cable(color, [
        [x, 0.17, -0.03],
        [x - 0.12, 0.22, 0.1],
        [-0.3, 0.2, 0.32],
        [-0.38 + i * 0.016, 0.16, 0.43],
      ]);
    });
    jst(0.344, 0.18, -0.03, 0.08, Math.PI / 2);
    jst(-0.356, 0.17, 0.43, 0.08, Math.PI / 2);

    // Salidas del driver → motores: bajan por el agujero central del chasis
    for (const [xb, zm] of [
      [-0.7, -0.45],
      [-0.3, 0.45],
    ] as const) {
      const lado = Math.sign(zm);
      for (const [color, d] of [
        [R, 0],
        [N, 0.016],
      ] as const)
        cable(color, [
          [xb + d, 0.17, 0.26 + d],
          [(xb - 0.1) / 2, 0.16, 0.12],
          [-0.1 + d, 0.06, d - 0.01],
          [-0.1 + d, -0.04, d],
          [-0.06, -0.09, lado * 0.25],
          [0.02, -0.12 - d, zm],
        ]);
      jst(xb + 0.008, 0.18, 0.268, 0.05, Math.PI / 4);
    }
    // Portapilas → alimentación del driver
    cable(R, [
      [-0.27, 0.06, -0.3],
      [-0.2, 0.2, 0.0],
      [-0.45, 0.25, 0.5],
      [-0.53, 0.17, 0.53],
    ]);
    cable(N, [
      [-0.27, 0.06, -0.284],
      [-0.18, 0.19, 0.02],
      [-0.46, 0.23, 0.52],
      [-0.515, 0.17, 0.53],
    ]);
    jst(-0.27, 0.06, -0.292, 0.05);
    jst(-0.522, 0.18, 0.53, 0.05, Math.PI / 2);
  }

  return {
    raiz,
    piezas,
    cables,
    liberar() {
      geometrias.forEach((geo) => geo.dispose());
      materiales.forEach((m) => m.dispose());
      texturas.forEach((t) => t.dispose());
    },
  };
}
