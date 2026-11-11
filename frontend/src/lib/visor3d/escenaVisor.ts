/**
 * VISOR 3D DE UNA PIEZA (solo navegador; se carga con import() cuando alguien abre el visor)
 *
 * Abre un .glb/.gltf, .stl u .obj, lo pone en milímetros sobre un suelo con su sombra, con la misma luz
 * de estudio que las fotos de las piezas (scripts/fotos-piezas/estudio.ts), y deja girarlo y acercarlo
 * con el ratón o los dedos. Las medidas salen de la caja que ocupa la pieza: ancho × fondo × alto.
 *
 * Para no gastar batería solo dibuja cuando algo cambia (girar, acercar, el giro automático del principio).
 */
import {
  ACESFilmicToneMapping,
  Box3,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PCFShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShadowMaterial,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { Modelo3D } from "@/config/modelos3d";
import { textoMedida } from "@/config/modelos3d";

export interface Medidas {
  ancho: number;
  fondo: number;
  alto: number;
}

export interface ControlVisor {
  medidas: Medidas;
  /** Enseña u oculta la caja con las medidas */
  verMedidas: (ver: boolean) => void;
  /** Acerca (>1) o aleja (<1) la cámara */
  acercar: (factor: number) => void;
  /** Vuelve a la vista del principio */
  reencuadrar: () => void;
  destruir: () => void;
}

interface Opciones {
  alProgreso?: (fraccion: number) => void;
  /** Se llama la primera vez que la persona toca el modelo (para esconder la pista «Arrastra para girar») */
  alTocar?: () => void;
}

/** Comprueba si el navegador puede dibujar en 3D (si no, se queda la foto) */
export function hayWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Abre el archivo con el cargador de su formato y devuelve la pieza */
async function cargar(modelo: Modelo3D, alProgreso?: (f: number) => void): Promise<Object3D> {
  const progreso = (e: ProgressEvent) => {
    if (e.lengthComputable && e.total > 0) alProgreso?.(e.loaded / e.total);
  };
  const materialLiso = () =>
    new MeshStandardMaterial({
      color: new Color(modelo.color),
      roughness: 1 - modelo.brillo * 0.8,
      metalness: modelo.metal ? 0.85 : 0.05,
    });

  if (modelo.formato === "glb" || modelo.formato === "gltf") {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/libs/meshopt_decoder.module.js"),
    ]);
    // Meshopt: los .glb comprimidos (npx gltf-transform meshopt) pesan hasta 10 veces menos
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(modelo.url, progreso);
    return gltf.scene;
  }

  if (modelo.formato === "stl") {
    const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
    const geometria: BufferGeometry = await new STLLoader().loadAsync(modelo.url, progreso);
    geometria.computeVertexNormals();
    // Algunos .stl traen color por cara (formato de Materialise): se respeta
    const material = materialLiso();
    if (geometria.hasAttribute("color")) material.vertexColors = true;
    return new Mesh(geometria, material);
  }

  // .obj (con su .mtl si lo tiene)
  const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
  const cargador = new OBJLoader();
  if (modelo.mtl) {
    const { MTLLoader } = await import("three/examples/jsm/loaders/MTLLoader.js");
    const materiales = await new MTLLoader().loadAsync(modelo.mtl);
    materiales.preload();
    cargador.setMaterials(materiales);
  }
  const obj = await cargador.loadAsync(modelo.url, progreso);
  if (!modelo.mtl) {
    obj.traverse((o) => {
      if (o instanceof Mesh) o.material = materialLiso();
    });
  }
  return obj;
}

/** Una etiqueta de medida (texto HTML que sigue al modelo) */
function etiqueta(texto: string): CSS2DObject {
  const div = document.createElement("div");
  div.textContent = texto;
  div.className =
    "pointer-events-none rounded-control bg-tinta/85 px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-white";
  return new CSS2DObject(div);
}

export async function crearVisor(
  contenedor: HTMLElement,
  modelo: Modelo3D,
  opciones: Opciones = {},
): Promise<ControlVisor> {
  const pieza = await cargar(modelo, opciones.alProgreso);

  // Pantalla
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.domElement.className = "block size-full touch-none outline-none";
  contenedor.appendChild(renderer.domElement);

  const etiquetas = new CSS2DRenderer();
  etiquetas.domElement.className = "pointer-events-none absolute inset-0";
  contenedor.appendChild(etiquetas.domElement);

  const escena = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environmentIntensity = 0.85;

  // La pieza en milímetros, centrada y apoyada en el suelo
  const grupo = new Group();
  pieza.scale.setScalar(modelo.escalaMm);
  pieza.rotation.set(...modelo.giro);
  pieza.traverse((o) => {
    if (o instanceof Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  grupo.add(pieza);
  grupo.updateMatrixWorld(true);
  const caja = new Box3().setFromObject(grupo);
  const centro = caja.getCenter(new Vector3());
  pieza.position.sub(new Vector3(centro.x, caja.min.y, centro.z));
  grupo.updateMatrixWorld(true);
  caja.setFromObject(grupo);
  escena.add(grupo);

  const tam = caja.getSize(new Vector3());
  const medidas: Medidas = { ancho: tam.x, fondo: tam.z, alto: tam.y };
  const r = caja.getBoundingSphere(new Sphere()).radius || 1;

  // Luz de estudio: cielo suave, sol con sombra y suelo invisible que solo recibe la sombra
  escena.add(new HemisphereLight(0xffffff, 0xd9dce3, 0.45));
  const sol = new DirectionalLight(0xfff8f0, 1.9);
  sol.position.set(r * 1.6, r * 3.8, r * 2.2);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.radius = 6;
  sol.shadow.bias = -0.0005;
  Object.assign(sol.shadow.camera, {
    left: -r * 1.5,
    right: r * 1.5,
    top: r * 1.5,
    bottom: -r * 1.5,
    near: r * 0.1,
    far: r * 10,
  });
  escena.add(sol);
  const suelo = new Mesh(new PlaneGeometry(r * 8, r * 8), new ShadowMaterial({ opacity: 0.18 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);

  // Caja de medidas: aristas finas en azul y una etiqueta en cada dirección
  const cajaMedidas = new Group();
  const aristas = new LineSegments(
    new EdgesGeometry(new BoxGeometry(tam.x, tam.y, tam.z)),
    new LineBasicMaterial({ color: 0x2d4bff, transparent: true, opacity: 0.7 }),
  );
  aristas.position.set(0, tam.y / 2, 0);
  cajaMedidas.add(aristas);
  const ancho = etiqueta(`${textoMedida(medidas.ancho)} ancho`);
  ancho.position.set(0, 0, tam.z / 2);
  const fondo = etiqueta(`${textoMedida(medidas.fondo)} fondo`);
  fondo.position.set(tam.x / 2, 0, 0);
  const alto = etiqueta(`${textoMedida(medidas.alto)} alto`);
  alto.position.set(tam.x / 2, tam.y / 2, tam.z / 2);
  cajaMedidas.add(ancho, fondo, alto);
  cajaMedidas.visible = false;
  escena.add(cajaMedidas);

  // Cámara: un poco desde arriba y de lado, como en las fotos
  const camara = new PerspectiveCamera(35, 1, r / 100, r * 100);
  const objetivo = new Vector3(0, tam.y / 2, 0);
  const posicionInicial = objetivo
    .clone()
    .add(
      new Vector3(0.55, 0.42, 0.72)
        .normalize()
        .multiplyScalar((r / Math.sin((35 * Math.PI) / 360)) * 1.3),
    );
  camara.position.copy(posicionInicial);

  const controles = new OrbitControls(camara, renderer.domElement);
  controles.target.copy(objetivo);
  controles.enableDamping = true;
  controles.enablePan = false;
  controles.minDistance = r * 0.6;
  controles.maxDistance = r * 8;
  controles.maxPolarAngle = Math.PI * 0.495; // no se mete por debajo del suelo
  controles.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  controles.autoRotateSpeed = 1.2;
  controles.update();

  // Dibujar solo cuando hace falta
  let pendiente = true;
  let visible = true;
  const dibujar = () => {
    const seguir = controles.update(); // true mientras el giro suave sigue moviéndose
    if (pendiente || seguir || controles.autoRotate) {
      renderer.render(escena, camara);
      etiquetas.render(escena, camara);
      pendiente = false;
    }
  };
  const encender = () => renderer.setAnimationLoop(visible ? dibujar : null);
  controles.addEventListener("change", () => (pendiente = true));
  controles.addEventListener("start", () => {
    controles.autoRotate = false;
    opciones.alTocar?.();
  });

  const ajustarTamano = () => {
    const { clientWidth: w, clientHeight: h } = contenedor;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    etiquetas.setSize(w, h);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    pendiente = true;
  };
  const observadorTamano = new ResizeObserver(ajustarTamano);
  observadorTamano.observe(contenedor);
  ajustarTamano();

  // Fuera de pantalla no se dibuja nada
  const observadorVista = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    encender();
  });
  observadorVista.observe(contenedor);
  encender();

  return {
    medidas,
    verMedidas: (ver) => {
      cajaMedidas.visible = ver;
      pendiente = true;
    },
    acercar: (factor) => {
      controles.autoRotate = false;
      const dir = camara.position.clone().sub(controles.target);
      const distancia = Math.min(
        Math.max(dir.length() / factor, controles.minDistance),
        controles.maxDistance,
      );
      camara.position.copy(controles.target).add(dir.setLength(distancia));
      pendiente = true;
    },
    reencuadrar: () => {
      camara.position.copy(posicionInicial);
      controles.target.copy(objetivo);
      pendiente = true;
    },
    destruir: () => {
      renderer.setAnimationLoop(null);
      observadorTamano.disconnect();
      observadorVista.disconnect();
      controles.dispose();
      escena.traverse((o) => {
        if (o instanceof Mesh || o instanceof LineSegments) {
          o.geometry.dispose();
          const materiales = Array.isArray(o.material) ? o.material : [o.material];
          materiales.forEach((m) => m.dispose());
        }
      });
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      etiquetas.domElement.remove();
    },
  };
}
