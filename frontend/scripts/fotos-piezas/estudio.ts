/**
 * ESTUDIO DE FOTOS (se ejecuta dentro de un navegador, lo abre scripts/fotos-piezas.mjs)
 * Monta cada pieza con la misma luz que el robot de la portada y le hace una foto
 * con el fondo transparente y su sombra suave en el suelo.
 */
import {
  NeutralToneMapping,
  Box3,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  Sphere,
  Vector3,
  VSMShadowMap,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { KITS, MODELOS } from "./modelos";
import { Taller } from "./taller";
import { texturaSombraSuave } from "./texturas";

const LADO = 1200; // píxeles de la foto (luego se reduce, así sale más nítida)

const lienzo = document.createElement("canvas");
lienzo.width = lienzo.height = LADO;
document.body.appendChild(lienzo);
const renderer = new WebGLRenderer({
  canvas: lienzo,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(LADO, LADO, false);
renderer.toneMapping = NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = VSMShadowMap;
const pmrem = new PMREMGenerator(renderer);
const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

function fotografiar(slug: string): string {
  const modelo = MODELOS[slug] ?? KITS[slug];
  if (!modelo) throw new Error(`No hay modelo para ${slug}`);
  const encuadre = { azimut: 30, elevacion: 32, giro: 0, margen: 1.06, ...modelo.encuadre };

  const escena = new Scene();
  escena.environment = entorno;
  escena.environmentIntensity = 1.05;

  // La pieza, centrada y apoyada en el suelo
  const taller = new Taller();
  modelo.construir(taller);
  const pieza = taller.grupo;
  pieza.rotation.y = (encuadre.giro * Math.PI) / 180;
  pieza.updateMatrixWorld(true);
  const caja = new Box3().setFromObject(pieza);
  const centro = caja.getCenter(new Vector3());
  pieza.position.set(-centro.x, -caja.min.y, -centro.z);
  escena.add(pieza);
  pieza.updateMatrixWorld(true);
  const esfera = new Box3().setFromObject(pieza).getBoundingSphere(new Sphere());
  const r = esfera.radius;

  // Luz como la de la portada: cielo suave, sol con sombra y un contraluz frío
  escena.add(new HemisphereLight(0xffffff, 0xd9dce3, 0.45));
  const sol = new DirectionalLight(0xfff8f0, 1.9);
  sol.position.copy(esfera.center).add(new Vector3(3, 7, 4).normalize().multiplyScalar(r * 4));
  sol.target.position.copy(esfera.center);
  escena.add(sol.target);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.blurSamples = 16;
  sol.shadow.radius = 8;
  sol.shadow.bias = -0.0005;
  const c = sol.shadow.camera;
  c.left = c.bottom = -r * 1.6;
  c.right = c.top = r * 1.6;
  c.near = r * 0.5;
  c.far = r * 8;
  escena.add(sol);
  const contraluz = new DirectionalLight(0xe2e7ff, 0.7);
  contraluz.position.set(-5, 3, -4);
  escena.add(contraluz);

  // Suelo invisible que solo recoge la sombra, y una sombra difusa debajo
  const suelo = new Mesh(new PlaneGeometry(r * 12, r * 12), new ShadowMaterial({ opacity: 0.16 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -0.0005 * r;
  suelo.receiveShadow = true;
  escena.add(suelo);
  const difusa = new Mesh(
    new PlaneGeometry(r * 2.6, r * 2.0),
    new MeshBasicMaterial({ map: texturaSombraSuave(), transparent: true, depthWrite: false }),
  );
  difusa.rotation.x = -Math.PI / 2;
  difusa.position.y = -0.001 * r;
  escena.add(difusa);

  // Cámara de teleobjetivo (poca deformación, como en una foto de producto)
  const fov = 22;
  const camara = new PerspectiveCamera(fov, 1, r * 0.05, r * 50);
  const az = (encuadre.azimut * Math.PI) / 180;
  const el = (encuadre.elevacion * Math.PI) / 180;
  const direccion = new Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  );
  const distancia = (r * encuadre.margen) / Math.sin(((fov / 2) * Math.PI) / 180);
  camara.position.copy(esfera.center).addScaledVector(direccion, distancia);
  camara.lookAt(esfera.center);
  camara.updateMatrixWorld();

  // Ajuste fino: centrar lo que se ve de verdad (los vértices de la pieza proyectados en la foto)
  let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
  const v = new Vector3();
  pieza.traverse((o) => {
    const m = o as Mesh;
    const posiciones = m.isMesh ? m.geometry.attributes.position : undefined;
    if (!posiciones) return;
    const salto = Math.max(1, Math.floor(posiciones.count / 4000));
    for (let i = 0; i < posiciones.count; i += salto) {
      v.fromBufferAttribute(posiciones, i).applyMatrix4(m.matrixWorld).project(camara);
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
  });
  const ocupa = Math.max(maxX - minX, maxY - minY) / 2; // 1 = todo el ancho
  camara.zoom = 0.8 / ocupa;
  camara.setViewOffset(
    LADO,
    LADO,
    ((minX + maxX) / 2) * (LADO / 2) * camara.zoom,
    -((minY + maxY) / 2) * (LADO / 2) * camara.zoom,
    LADO,
    LADO,
  );
  camara.updateProjectionMatrix();

  renderer.render(escena, camara);

  // Los bordes de la foto se funden a transparente: así la sombra no deja un cuadrado marcado
  const final = document.createElement("canvas");
  final.width = final.height = LADO;
  const ctx = final.getContext("2d")!;
  ctx.drawImage(lienzo, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  for (const [x1, y1] of [
    [LADO, 0],
    [0, LADO],
  ]) {
    const fundido = ctx.createLinearGradient(0, 0, x1, y1);
    fundido.addColorStop(0, "rgba(0,0,0,0)");
    fundido.addColorStop(0.1, "rgba(0,0,0,1)");
    fundido.addColorStop(0.9, "rgba(0,0,0,1)");
    fundido.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fundido;
    ctx.fillRect(0, 0, LADO, LADO);
  }
  const datos = final.toDataURL("image/png");

  // Liberar memoria antes de la siguiente pieza
  escena.traverse((o) => {
    const m = o as Mesh;
    if (m.geometry) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      for (const valor of Object.values(mat))
        if (valor && typeof valor === "object" && "isTexture" in valor)
          (valor as { dispose(): void }).dispose();
      mat.dispose();
    }
  });
  return datos;
}

Object.assign(window, { fotografiar, piezas: Object.keys(MODELOS), kits: Object.keys(KITS) });
