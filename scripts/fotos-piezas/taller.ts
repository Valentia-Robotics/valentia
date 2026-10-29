/**
 * Herramientas para construir las piezas en 3D (estudio de fotos de scripts/fotos-piezas).
 * Cada pieza se hace con formas sencillas (cajas, cilindros, tubos) y texturas de canvas.
 * Las medidas de cada pieza van en sus propias unidades: la cámara la encuadra sola.
 */
import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type MeshPhysicalMaterialParameters,
  type MeshStandardMaterialParameters,
  type Object3D,
  type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type Eje = "x" | "y" | "z";

export class Taller {
  grupo = new Group();

  mat(opciones: MeshStandardMaterialParameters) {
    return new MeshStandardMaterial(opciones);
  }

  fisico(opciones: MeshPhysicalMaterialParameters) {
    return new MeshPhysicalMaterial(opciones);
  }

  malla(
    geo: BufferGeometry,
    material: Material | Material[],
    x = 0,
    y = 0,
    z = 0,
    padre: Object3D = this.grupo,
  ) {
    const m = new Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    padre.add(m);
    return m;
  }

  /** Caja centrada en (x, y, z) */
  caja(
    w: number,
    h: number,
    d: number,
    material: Material | Material[],
    x = 0,
    y = 0,
    z = 0,
    padre?: Object3D,
  ) {
    return this.malla(new BoxGeometry(w, h, d), material, x, y, z, padre);
  }

  /** Caja con las aristas redondeadas */
  redonda(
    w: number,
    h: number,
    d: number,
    radio: number,
    material: Material,
    x = 0,
    y = 0,
    z = 0,
    padre?: Object3D,
  ) {
    return this.malla(new RoundedBoxGeometry(w, h, d, 3, radio), material, x, y, z, padre);
  }

  /** Cilindro a lo largo del eje indicado */
  cilindro(
    radio: number,
    largo: number,
    material: Material | Material[],
    x = 0,
    y = 0,
    z = 0,
    eje: Eje = "y",
    segmentos = 32,
    radioArriba = radio,
    padre?: Object3D,
  ) {
    const m = this.malla(
      new CylinderGeometry(radioArriba, radio, largo, segmentos),
      material,
      x,
      y,
      z,
      padre,
    );
    if (eje === "x") m.rotation.z = -Math.PI / 2;
    if (eje === "z") m.rotation.x = Math.PI / 2;
    return m;
  }

  /** Tubo que pasa por los puntos (cables, muelles…) */
  tubo(
    puntos: [number, number, number][],
    radio: number,
    material: Material,
    segmentos = 96,
    padre?: Object3D,
  ) {
    const curva = new CatmullRomCurve3(
      puntos.map((p) => new Vector3(...p)),
      false,
      "centripetal",
    );
    return this.malla(
      new TubeGeometry(curva, segmentos, radio, 10, false),
      material,
      0,
      0,
      0,
      padre,
    );
  }

  /** Materiales de una caja con textura solo en una cara ([+x, -x, +y, -y, +z, -z]) */
  caras(lado: Material, cara: Material, indice = 2) {
    const lista: Material[] = [lado, lado, lado, lado, lado, lado];
    lista[indice] = cara;
    return lista;
  }

  /** Placa de circuito: cara de arriba con su serigrafía; la cara de arriba queda en y */
  pcb(
    w: number,
    d: number,
    grosor: number,
    colorLado: number,
    serigrafia: Texture,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const lado = this.mat({ color: colorLado, roughness: 0.55 });
    const arriba = this.mat({ map: serigrafia, roughness: 0.42, metalness: 0.05 });
    return this.caja(w, grosor, d, this.caras(lado, arriba), x, y - grosor / 2, z);
  }

  // ---------- Materiales que se repiten ----------
  private cache = new Map<string, MeshStandardMaterial>();
  private comun(clave: string, opciones: MeshStandardMaterialParameters) {
    let m = this.cache.get(clave);
    if (!m) {
      m = this.mat(opciones);
      this.cache.set(clave, m);
    }
    return m;
  }
  get oro() {
    return this.comun("oro", { color: 0xe0bd62, metalness: 1, roughness: 0.26 });
  }
  get acero() {
    return this.comun("acero", { color: 0xcfd3d8, metalness: 1, roughness: 0.22 });
  }
  get laton() {
    return this.comun("laton", { color: 0xc9a24a, metalness: 0.95, roughness: 0.3 });
  }
  get plasticoNegro() {
    return this.comun("negro", { color: 0x161616, roughness: 0.55 });
  }
  get estano() {
    return this.comun("estano", { color: 0xd8dbe0, metalness: 0.9, roughness: 0.35 });
  }

  /**
   * Tira de pines macho: base de plástico negro y pines dorados.
   * (x, y, z) es el centro de la base. Los pines van en fila a lo largo de `eje`
   * y apuntan hacia arriba (`arriba`) y hacia abajo (`abajo`) desde la base.
   */
  pinesMacho(
    n: number,
    x: number,
    y: number,
    z: number,
    eje: "x" | "z",
    arriba = 0.6,
    abajo = 0.3,
    paso = 0.254,
  ) {
    const largo = n * paso;
    this.caja(
      eje === "x" ? largo : 0.25,
      0.25,
      eje === "x" ? 0.25 : largo,
      this.plasticoNegro,
      x,
      y,
      z,
    );
    const pin = new BoxGeometry(0.064, arriba + abajo + 0.25, 0.064);
    const centro = y + (arriba - abajo) / 2;
    for (let i = 0; i < n; i++) {
      const o = -largo / 2 + paso / 2 + i * paso;
      this.malla(pin, this.oro, eje === "x" ? x + o : x, centro, eje === "x" ? z : z + o);
    }
  }

  /** Pines macho acodados (en ángulo recto): salen en horizontal hacia `sentido` (±1 en x) */
  pinesAcodados(n: number, x: number, y: number, z: number, sentido: 1 | -1, paso = 0.254) {
    const largo = n * paso;
    this.caja(0.25, 0.25, largo, this.plasticoNegro, x, y + 0.125, z);
    const horizontal = new BoxGeometry(0.85, 0.064, 0.064);
    const vertical = new BoxGeometry(0.064, 0.2, 0.064);
    for (let i = 0; i < n; i++) {
      const o = -largo / 2 + paso / 2 + i * paso;
      this.malla(horizontal, this.oro, x + sentido * 0.42, y + 0.125, z + o);
      this.malla(vertical, this.oro, x - sentido * 0.05, y + 0.02, z + o);
    }
  }

  /** Soldadura (gotita brillante) */
  soldadura(x: number, y: number, z: number, r = 0.07) {
    this.cilindro(r, 0.05, this.estano, x, y + 0.025, z, "y", 12, r * 0.4);
  }

  /** Componente SMD pequeño (resistencia o condensador) con sus extremos de estaño */
  smd(x: number, y: number, z: number, color: number, w = 0.16, d = 0.08, giro = false) {
    const cuerpo = this.comun(`smd${color}`, { color, roughness: 0.5 });
    const g = new Group();
    g.position.set(x, y, z);
    if (giro) g.rotation.y = Math.PI / 2;
    this.grupo.add(g);
    this.caja(w * 0.6, 0.05, d, cuerpo, 0, 0.025, 0, g);
    for (const s of [-1, 1]) this.caja(w * 0.2, 0.052, d, this.estano, s * w * 0.4, 0.026, 0, g);
  }

  /** Chip negro con patas a los lados (SOIC) */
  chip(x: number, y: number, z: number, w: number, d: number, patas: number, rotulo?: Texture) {
    const negro = this.comun("chip", { color: 0x141414, roughness: 0.42 });
    const cara = rotulo ? this.mat({ map: rotulo, roughness: 0.42 }) : negro;
    this.caja(w, 0.12, d, this.caras(negro, cara), x, y + 0.08, z);
    const pata = new BoxGeometry(0.035, 0.04, 0.12);
    for (let i = 0; i < patas; i++) {
      const px = x - w / 2 + (w / patas) * (i + 0.5);
      for (const s of [-1, 1]) this.malla(pata, this.estano, px, y + 0.03, z + s * (d / 2 + 0.05));
    }
  }

  /** Tornillo de cabeza redonda con estrella (visto desde arriba) */
  tornillo(x: number, y: number, z: number, r: number) {
    this.cilindro(r, r * 0.6, this.acero, x, y + r * 0.3, z, "y", 24, r * 0.85);
    this.caja(r * 1.2, r * 0.2, r * 0.22, this.plasticoNegro, x, y + r * 0.62, z);
    this.caja(r * 0.22, r * 0.2, r * 1.2, this.plasticoNegro, x, y + r * 0.62, z);
  }

  /** Tuerca hexagonal */
  tuerca(x: number, y: number, z: number, r: number) {
    this.cilindro(r, r * 0.7, this.acero, x, y + r * 0.35, z, "y", 6);
    this.cilindro(r * 0.45, r * 0.72, this.plasticoNegro, x, y + r * 0.35, z, "y", 16);
  }
}
