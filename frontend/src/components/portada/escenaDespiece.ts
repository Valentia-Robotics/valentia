/**
 * ESCENA 3D DE LA PORTADA: la foto del taller (abuelo y nieta) de fondo y el VR1 sobre su mesa, con el
 * destornillador y la tornillería al lado. La cámara mira desde la misma altura que la foto (≈ 15° sobre
 * la mesa) y la luz entra por su ventana, a la izquierda.
 *
 * La foto también es 3D: se pinta con su mapa de profundidad (scripts/profundidad-taller.mjs) y, al
 * mover el ratón (en el móvil, sola y despacio), la cámara se desplaza un poco: la mesa se mueve más que
 * las personas y estas más que la pared, y el coche gira lo justo y se queda pegado a la mesa.
 * Montado gira despacio; al bajar por la portada se despieza por capas (chasis → placa → motores →
 * sensores → alimentación), la foto se desenfoca y se vela, y al final se vuelve a montar.
 *
 * En cada fotograma calcula dónde cae en pantalla el centro de cada capa (`alDibujar`): con eso la
 * portada dibuja las líneas de cota en HTML/SVG, siempre pegadas a su pieza.
 *
 * Importa "three" (pesado): SOLO se carga con import() desde DespieceVR1.tsx, cuando la página ya se ve.
 */
import {
  ACESFilmicToneMapping,
  Box3,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  ShadowMaterial,
  Sphere,
  TextureLoader,
  Vector2,
  Vector3,
  VSMShadowMap,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { fusionarMallas } from "./fusionarMallas";
import { SUELO, crearModeloCoche } from "./modeloCoche";
import { PIEZAS_ROBOT, type PiezaRobot } from "./piezasRobot";
import {
  AJUSTES_CALIDAD,
  NIVEL_INFERIOR,
  crearVigilante,
  type Nivel3D,
  type NivelCalidad,
} from "@/lib/visor3d/calidad";
import { entornoDelTaller, realzarMateriales } from "@/lib/visor3d/realismo";
import { texturaSombra } from "./texturasRobot";

type IdCapa = PiezaRobot["id"];

/** Dónde cae en pantalla (px del lienzo) el centro de cada capa */
export type Anclas = Record<IdCapa, { x: number; y: number }>;

export interface EscenaDespiece {
  /** Cuánto está abierto el coche: 0 = montado, 1 = en capas */
  abrir(valor: number): void;
  /** La capa de la que se habla: se aclara y la cámara se acerca un poco (null = vista general) */
  enfocar(id: IdCapa | null): void;
  /** Con qué calidad se está dibujando ahora (puede bajar sola si va a tirones) */
  calidad(): NivelCalidad;
  /** Pausa el dibujo (cuando no se ve) */
  pausar(pausada: boolean): void;
  destruir(): void;
}

/** 1 unidad de la escena ≈ 85 mm (la escala de modeloCoche.ts) */
const MM = 1 / 85;
/** Desde dónde mira la cámara (dirección, ≈ 15° de elevación como la foto; la distancia cambia al abrir) */
const DESDE = new Vector3(5.2, 2.25, 6.4);
/** Giro del coche cuando está abierto: tres cuartos, la vista en la que se leen mejor las capas */
const GIRO_ABIERTO = -0.35;
const EJE_Y = new Vector3(0, 1, 0);

/** La foto del fondo y su mapa de profundidad (blanco = cerca), con su tamaño en px */
const FOTO = {
  url: "/images/portada/taller-fondo.webp",
  profundidad: "/images/portada/taller-profundidad.png",
  ancho: 1672,
  alto: 941,
};
/**
 * Cómo se encaja la foto en el lienzo: lo mismo que el <Image> de DespieceVR1.tsx (object-cover con
 * object-position 50 % 100 % en pantallas anchas y 44 % 100 % en el móvil, y escala 1,035 desde el
 * 55 % 100 %: el margen que necesita el paralaje). Si cambia allí, cambiarlo aquí.
 */
const ENCUADRE = { ancha: [0.5, 1], estrecha: [0.44, 1], escala: 1.035, origen: [0.55, 1] } as const;
/** Cercanía que no se mueve con el paralaje: el plano del abuelo y la nieta */
const PIVOTE = 0.45;

/** De un punto del lienzo (0–1, desde arriba) al punto de la foto que se ve ahí (0–1, desde arriba) */
function puntoDeFoto(
  sx: number,
  sy: number,
  ancho: number,
  alto: number,
  [ex, ey]: readonly number[],
  zoom: number,
): [number, number] {
  const [ox, oy] = ENCUADRE.origen;
  const x = ox + (sx - ox) / zoom;
  const y = oy + (sy - oy) / zoom;
  const c = Math.max(ancho / FOTO.ancho, alto / FOTO.alto);
  const dw = FOTO.ancho * c;
  const dh = FOTO.alto * c;
  return [(x * ancho - (ancho - dw) * ex) / dw, (y * alto - (alto - dh) * ey) / dh];
}

/** La misma cuenta que puntoDeFoto, en el shader, más el paralaje y el velo del despiece */
const SOMBREADO_FOTO = /* glsl */ `
  uniform sampler2D foto;
  uniform sampler2D profundidad;
  uniform vec2 lienzo;
  uniform vec2 tamFoto;
  uniform vec2 encuadre;
  uniform vec2 origen;
  uniform float zoom;
  uniform vec2 paralaje;
  uniform float pivote;
  uniform float velo;
  uniform float desenfoque;
  uniform vec3 papel;
  varying vec2 vUv;

  vec2 aFoto(vec2 s) {
    s = origen + (s - origen) / zoom;
    float c = max(lienzo.x / tamFoto.x, lienzo.y / tamFoto.y);
    vec2 d = tamFoto * c;
    vec2 t = (s * lienzo - (lienzo - d) * encuadre) / d;
    return vec2(t.x, 1.0 - t.y);
  }

  void main() {
    vec2 s = vec2(vUv.x, 1.0 - vUv.y);
    // Dos pasadas: la cercanía del punto que de verdad acaba aquí, no la del sitio de partida
    float cerca = texture2D(profundidad, aFoto(s)).r;
    cerca = texture2D(profundidad, aFoto(s + paralaje * (cerca - pivote))).r;
    vec3 color = texture2D(foto, aFoto(s + paralaje * (cerca - pivote)), desenfoque).rgb;
    gl_FragColor = vec4(mix(color, papel, velo), 1.0);
  }
`;

const ceder = () => new Promise<void>((listo) => setTimeout(listo, 0));
const suave = (t: number) => t * t * (3 - 2 * t);
const tramo = (desde: number, hasta: number, v: number) =>
  suave(Math.min(1, Math.max(0, (v - desde) / (hasta - desde))));

export async function crearEscenaDespiece(
  canvas: HTMLCanvasElement,
  {
    calidad: calidadInicial = "alta",
    alDibujar,
    alRendirse,
  }: {
    /** Calidad de partida (lib/visor3d/calidad.ts); si va a tirones, baja sola */
    calidad?: Nivel3D;
    alDibujar?: (anclas: Anclas, apertura: number) => void;
    /** Ni en «baja» va fluido: la portada debe enseñar la foto fija (la escena ya se ha parado) */
    alRendirse?: () => void;
  } = {},
): Promise<EscenaDespiece> {
  let nivel: NivelCalidad = calidadInicial;
  let ajustes = AJUSTES_CALIDAD[calidadInicial];
  canvas.dataset.calidad = nivel;
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, ajustes.pixeles));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = ajustes.sombras;
  renderer.shadowMap.type = VSMShadowMap;

  const geometrias: BufferGeometry[] = [];
  const materiales: Material[] = [];
  const texturas: Texture[] = [];
  const g = <T extends BufferGeometry>(x: T) => (geometrias.push(x), x);
  const m = <T extends Material>(x: T) => (materiales.push(x), x);
  const tx = <T extends Texture>(x: T) => (texturas.push(x), x);

  const escena = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  // Reflejos de partida: un estudio genérico. Con calidad media o alta se cambian por los de la foto del taller
  let entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environment = entorno;
  escena.environmentIntensity = 0.75;
  await ceder();

  // Teleobjetivo: sin deformar, como una foto de producto
  const camara = new PerspectiveCamera(20, 1, 0.1, 120);
  const mira = new Vector3(0, 0.05, 0);

  // Luz de día: cielo + ventana a la izquierda (sombras suaves hacia atrás a la derecha)
  escena.add(new HemisphereLight(0xfdfbf6, 0xcdb999, 0.85));
  const ventana = new DirectionalLight(0xfff2e0, 2.3);
  ventana.position.set(-3.6, 6.8, 4.6);
  ventana.castShadow = ajustes.sombras;
  ventana.shadow.mapSize.setScalar(ajustes.mapaSombras);
  ventana.shadow.blurSamples = ajustes.muestrasSombra;
  ventana.shadow.radius = 8;
  ventana.shadow.bias = -0.0006;
  Object.assign(ventana.shadow.camera, {
    left: -3.4,
    right: 3.4,
    top: 3.4,
    bottom: -3.4,
    near: 1,
    far: 20,
  });
  escena.add(ventana);
  const rebote = new DirectionalLight(0xe8eeff, 0.55);
  rebote.position.set(6, 2.5, -2);
  escena.add(rebote);

  // ---------------------------------------------------------------- LA MESA DE LA FOTO
  // No hay mesa en 3D: el coche se apoya en la de la foto del taller. Este plano invisible solo recoge
  // las sombras, así el coche y sus tornillos «pisan» la madera de la foto.
  const mesa = new Group();
  mesa.rotation.y = Math.atan2(DESDE.x, DESDE.z);
  escena.add(mesa);

  const recogeSombras = new Mesh(
    g(new PlaneGeometry(16, 16)),
    m(new ShadowMaterial({ color: 0x3a2410, opacity: 0.38 })),
  );
  recogeSombras.rotation.x = -Math.PI / 2;
  recogeSombras.position.y = SUELO;
  recogeSombras.receiveShadow = true;
  mesa.add(recogeSombras);

  // Destornillador de precisión (mango hexagonal naranja, no rueda) y la tornillería M3 suelta.
  // Transparentes desde el principio: se desvanecen al despiezar (three no deja cambiarlo en marcha)
  const herramientas = new Group();
  mesa.add(herramientas);
  const naranja = m(
    new MeshStandardMaterial({ color: 0xff5a0a, roughness: 0.42, transparent: true }),
  );
  const acero = m(
    new MeshStandardMaterial({ color: 0xc4c8ce, metalness: 1, roughness: 0.3, transparent: true }),
  );
  const negro = m(new MeshStandardMaterial({ color: 0x15171b, roughness: 0.5, transparent: true }));
  const destornillador = new Group();
  const pieza = (geo: BufferGeometry, mat: Material, x: number) => {
    const malla = new Mesh(geo, mat);
    malla.rotation.z = Math.PI / 2;
    malla.position.x = x;
    malla.castShadow = malla.receiveShadow = true;
    destornillador.add(malla);
  };
  pieza(g(new CylinderGeometry(0.095, 0.095, 0.95, 6)), naranja, 0);
  pieza(g(new CylinderGeometry(0.07, 0.095, 0.12, 6)), negro, -0.535);
  pieza(g(new CylinderGeometry(0.021, 0.021, 0.62, 12)), acero, -0.9);
  pieza(g(new CylinderGeometry(0.005, 0.021, 0.08, 12)), acero, -1.25);
  // Detrás y a la derecha del coche, fuera de su radio de giro (≈ 1,52)
  destornillador.position.set(2.05, SUELO + 0.095, -0.8);
  destornillador.rotation.y = 0.75;
  herramientas.add(destornillador);

  const tornilloCabeza = g(new CylinderGeometry(2.7 * MM, 2.7 * MM, 1.8 * MM, 16));
  const tornilloCuerpo = g(new CylinderGeometry(1.5 * MM, 1.5 * MM, 10 * MM, 10));
  const tuercaGeo = g(new CylinderGeometry(3.2 * MM, 3.2 * MM, 2.4 * MM, 6));
  const sueltos: [number, number, number, "tornillo" | "tuerca"][] = [
    [-1.78, 0.55, 0.4, "tornillo"],
    [-1.95, 1.05, 2.1, "tuerca"],
    [1.72, 0.95, 0.2, "tuerca"],
    [1.95, -0.35, 2.6, "tornillo"],
    [1.62, 1.35, 1.2, "tornillo"],
  ];
  for (const [x, z, giro, tipo] of sueltos) {
    const grupo = new Group();
    if (tipo === "tornillo") {
      const cabeza = new Mesh(tornilloCabeza, acero);
      cabeza.rotation.z = Math.PI / 2;
      const cuerpo = new Mesh(tornilloCuerpo, acero);
      cuerpo.rotation.z = Math.PI / 2;
      cuerpo.position.x = 5.9 * MM;
      grupo.add(cabeza, cuerpo);
      grupo.position.set(x, SUELO + 2.7 * MM, z);
    } else {
      grupo.add(new Mesh(tuercaGeo, acero));
      grupo.position.set(x, SUELO + 1.2 * MM, z);
    }
    grupo.rotation.y = giro;
    grupo.traverse((o) => {
      o.castShadow = true;
    });
    herramientas.add(grupo);
  }
  await ceder();

  // ---------------------------------------------------------------- LA FOTO, EN 3D
  // Se pinta en el mismo lienzo, antes que el coche, sobre un rectángulo que ocupa todo
  const cargador = new TextureLoader();
  const [foto, profundidad] = await Promise.all([
    cargador.loadAsync(FOTO.url).then(tx),
    cargador.loadAsync(FOTO.profundidad).then(tx),
  ]);
  if (ajustes.reflejosTaller) {
    // El metal y los barnices reflejan la ventana y la madera de la foto, no un estudio cualquiera
    const delTaller = entornoDelTaller(foto.image as HTMLImageElement, pmrem, {
      luz: [ventana.position.x, ventana.position.y, ventana.position.z],
      fondo: [-DESDE.x, -0.15, -DESDE.z],
    });
    entorno.dispose();
    entorno = delTaller;
    escena.environment = entorno;
    escena.environmentIntensity = 0.9;
    await ceder();
  }
  profundidad.generateMipmaps = false;
  profundidad.minFilter = LinearFilter;
  // El mapa también se lee aquí: a qué distancia está la mesa justo donde se apoya el coche
  const imagenProfundidad = profundidad.image as HTMLImageElement;
  const lectorProfundidad = document.createElement("canvas");
  lectorProfundidad.width = imagenProfundidad.naturalWidth;
  lectorProfundidad.height = imagenProfundidad.naturalHeight;
  const contexto = lectorProfundidad.getContext("2d");
  contexto?.drawImage(imagenProfundidad, 0, 0);
  const cercanias = contexto?.getImageData(0, 0, lectorProfundidad.width, lectorProfundidad.height);
  const cercaniaEn = (u: number, v: number) => {
    if (!cercanias) return PIVOTE;
    const x = Math.round(Math.min(1, Math.max(0, u)) * (cercanias.width - 1));
    const y = Math.round(Math.min(1, Math.max(0, v)) * (cercanias.height - 1));
    return cercanias.data[(y * cercanias.width + x) * 4] / 255;
  };

  const fotoMaterial = m(
    new ShaderMaterial({
      uniforms: {
        foto: { value: foto },
        profundidad: { value: profundidad },
        lienzo: { value: new Vector2(1, 1) },
        tamFoto: { value: new Vector2(FOTO.ancho, FOTO.alto) },
        encuadre: { value: new Vector2(...ENCUADRE.ancha) },
        origen: { value: new Vector2(...ENCUADRE.origen) },
        zoom: { value: ENCUADRE.escala },
        paralaje: { value: new Vector2() },
        pivote: { value: PIVOTE },
        velo: { value: 0 },
        desenfoque: { value: 0 },
        papel: { value: new Vector3(0xf4 / 255, 0xf4 / 255, 0xf0 / 255) }, // --color-papel-plano
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: SOMBREADO_FOTO,
      depthTest: false,
      depthWrite: false,
    }),
  );
  const fondo = new Scene();
  const lamina = new Mesh(g(new PlaneGeometry(2, 2)), fotoMaterial);
  lamina.frustumCulled = false;
  fondo.add(lamina);
  const camaraFondo = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  renderer.autoClear = false;
  await ceder();

  // ---------------------------------------------------------------- EL COCHE
  const modelo = crearModeloCoche();
  await ceder();
  // Materiales que se comportan como los de verdad (antes de fusionar las mallas: van por material)
  const realce = ajustes.materialesFinos
    ? realzarMateriales(
        modelo.raiz,
        [...[...modelo.piezas.values()].map((p) => p.materiales), modelo.cables.materiales],
        { anisotropia: Math.min(ajustes.anisotropia, renderer.capabilities.getMaxAnisotropy()) },
      )
    : { materiales: [], texturas: [] };
  realce.materiales.forEach(m);
  realce.texturas.forEach(tx);
  await ceder();
  const fusionadas = [...modelo.piezas.values(), modelo.cables].flatMap((p) =>
    fusionarMallas(p.grupo),
  );
  await ceder();
  const robot = modelo.raiz;
  escena.add(robot);

  // Centro de cada capa (montada, en coordenadas del coche): el ancla de su línea de cota
  const caja = new Box3();
  const esfera = new Sphere();
  robot.updateMatrixWorld(true);
  const radioTotal = caja.setFromObject(robot).getBoundingSphere(esfera).radius;
  const centros = new Map<IdCapa, { centro: Vector3; acercar: number }>();
  for (const [id, registro] of modelo.piezas) {
    caja.setFromObject(registro.grupo).getBoundingSphere(esfera);
    centros.set(id, {
      centro: robot.worldToLocal(esfera.center.clone()),
      acercar: Math.min(0.97, Math.max(0.86, (esfera.radius / radioTotal) * 0.4 + 0.74)),
    });
  }

  // Los cables se desvanecen al abrirlo: transparentes desde el principio (ver las herramientas)
  for (const material of modelo.cables.materiales) material.transparent = true;

  // Al hablar de una capa, se aclara con su propio color
  for (const registro of modelo.piezas.values())
    for (const material of registro.materiales) material.emissive.copy(material.color);

  // Sombra de contacto bajo el coche (la del sol la pone la luz de la ventana)
  const difusa = new Mesh(
    g(new PlaneGeometry(4.2, 3)),
    m(
      new MeshBasicMaterial({
        map: tx(texturaSombra()),
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      }),
    ),
  );
  difusa.rotation.x = -Math.PI / 2;
  difusa.position.y = SUELO + 0.001;
  escena.add(difusa);

  // ---------------------------------------------------------------- ENCUADRE
  let ancha = true;
  let anchoLienzo = 1;
  let altoLienzo = 1;
  let aperturaVista = -1;
  /** Lo que se mueve el coche para seguir a la mesa con el paralaje (fracción del lienzo) */
  const pegado = new Vector2();
  /**
   * Montado, el coche se apoya en la mesa de la foto, delante de las manos de la niña (abajo, junto al
   * cajetín; en el móvil, abajo del todo). Abierto, sube al centro para que quepan las cinco capas.
   */
  function colocar(apertura: number) {
    aperturaVista = apertura;
    const a = suave(apertura);
    const [x, y] = ancha ? [-0.07 * (1 - a), -0.28 * (1 - a) + 0.02 * a] : [0, -0.3 + 0.4 * a];
    camara.setViewOffset(
      anchoLienzo,
      altoLienzo,
      anchoLienzo * (x + pegado.x),
      altoLienzo * (y + pegado.y),
      anchoLienzo,
      altoLienzo,
    );
  }
  function ajustarTamano() {
    const { clientWidth: ancho, clientHeight: alto } = canvas;
    if (!ancho || !alto) return;
    anchoLienzo = ancho;
    altoLienzo = alto;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    ancha = ancho >= 1024;
    fotoMaterial.uniforms.lienzo.value.set(ancho, alto);
    fotoMaterial.uniforms.encuadre.value.set(...(ancha ? ENCUADRE.ancha : ENCUADRE.estrecha));
    camara.zoom = ancha ? 1.04 : Math.min(1, 1.08 * camara.aspect);
    colocar(aperturaVista < 0 ? 0 : aperturaVista);
    camara.updateProjectionMatrix();
  }
  const observador = new ResizeObserver(ajustarTamano);
  observador.observe(canvas);
  ajustarTamano();

  // ---------------------------------------------------------------- ANIMACIÓN
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Paralaje: con ratón lo sigue; en pantallas táctiles la cámara se mece sola, muy despacio
  const conRaton = window.matchMedia("(pointer: fine)").matches;
  const raton = new Vector2();
  const mirada = new Vector2();
  const alMoverRaton = (e: PointerEvent) =>
    raton.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  if (conRaton && !quieto) window.addEventListener("pointermove", alMoverRaton, { passive: true });
  let objetivo = 0;
  let apertura = 0;
  let pausada = false;
  let marco = 0;
  let anterior = performance.now();
  let giroLibre = GIRO_ABIERTO;
  let giroAbierto = GIRO_ABIERTO; // la vuelta más cercana a GIRO_ABIERTO (se fija al empezar a abrir)
  let activa: IdCapa | null = null;
  const brillo = new Map<IdCapa, number>(PIEZAS_ROBOT.map((p) => [p.id, 0]));
  const miraAhora = mira.clone();
  const miraDestino = new Vector3();
  const punto = new Vector3();
  let distancia = ancha ? 1.7 : 1.2; // empieza ya en su sitio (sin acercarse de golpe)
  const anclas = Object.fromEntries(PIEZAS_ROBOT.map((p) => [p.id, { x: 0, y: 0 }])) as Anclas;

  /** Baja un nivel de calidad sin parar la animación (o se rinde y deja la foto fija) */
  const vigilante = crearVigilante();
  function bajarCalidad() {
    if (nivel === "foto") return;
    nivel = NIVEL_INFERIOR[nivel];
    canvas.dataset.calidad = nivel;
    if (nivel === "foto") {
      cancelAnimationFrame(marco);
      alRendirse?.();
      return;
    }
    ajustes = AJUSTES_CALIDAD[nivel];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, ajustes.pixeles));
    ajustarTamano();
    if (!ajustes.sombras && renderer.shadowMap.enabled) {
      renderer.shadowMap.enabled = false;
      ventana.castShadow = false;
      // Los sombreadores se rehacen sin la parte de las sombras
      escena.traverse((o) => {
        const malla = o as Mesh;
        if (!malla.isMesh) return;
        for (const material of [malla.material].flat()) material.needsUpdate = true;
      });
    }
  }

  function dibujar(ahora: number) {
    marco = requestAnimationFrame(dibujar);
    if (vigilante.apuntar(ahora - anterior)) {
      bajarCalidad();
      if (nivel === "foto") return;
    }
    const dt = Math.min((ahora - anterior) / 1000, 0.05);
    anterior = ahora;

    apertura += (objetivo - apertura) * Math.min(1, dt * 4.5);
    if (Math.abs(objetivo - apertura) < 0.0005) apertura = objetivo;

    // Montado gira despacio; al abrirse se coloca en tres cuartos y se queda quieto
    if (apertura < 0.01) {
      if (!quieto) giroLibre += dt * 0.14;
      const vueltas = Math.round((giroLibre - GIRO_ABIERTO) / (Math.PI * 2));
      giroAbierto = GIRO_ABIERTO + vueltas * Math.PI * 2;
    }
    const a = suave(Math.min(1, apertura * 1.6));
    robot.rotation.y = giroLibre + (giroAbierto - giroLibre) * a;
    if (apertura > 0.99) giroLibre = giroAbierto;

    for (const p of PIEZAS_ROBOT) {
      const registro = modelo.piezas.get(p.id);
      if (!registro) continue;
      const [x, y, z] = p.direccion3d;
      registro.grupo.position.set(x * apertura, y * apertura, z * apertura);
      // Brillo de la capa activa (suave, sin parpadeos)
      const meta = p.id === activa && apertura > 0.5 ? 0.16 : 0;
      const actual = brillo.get(p.id)! + (meta - brillo.get(p.id)!) * Math.min(1, dt * 6);
      brillo.set(p.id, actual);
      for (const material of registro.materiales) material.emissiveIntensity = actual;
    }

    // Los cables se desvanecen al abrirlo: con las capas separadas no tendrían sentido
    const opacidad = 1 - Math.min(1, apertura * 4);
    modelo.cables.grupo.visible = opacidad > 0.01;
    for (const material of modelo.cables.materiales) material.opacity = opacidad;
    difusa.material.opacity = 0.55 * (1 - apertura * 0.6);
    // Despiezado, las sombras de las capas en el aire ensucian la foto velada: se aclaran
    recogeSombras.material.opacity = 0.38 * (1 - apertura * 0.75);
    // Las herramientas se apartan al despiezar: el plano es solo del coche
    const presencia = 1 - tramo(0.04, 0.3, apertura);
    herramientas.visible = presencia > 0.01;
    for (const material of [naranja, acero, negro]) material.opacity = presencia;

    // La foto: paralaje según la mirada; al despiezar se acerca un poco, se desenfoca y se vela
    if (!quieto) {
      const t = ahora / 1000;
      const deriva = conRaton ? 0.12 : 0.5;
      const paso = Math.min(1, dt * 2.5);
      mirada.x += (raton.x + deriva * Math.sin(t * 0.23) - mirada.x) * paso;
      mirada.y += (raton.y + deriva * 0.5 * Math.sin(t * 0.17 + 1) - mirada.y) * paso;
    }
    const enfoque = tramo(0.05, 0.9, apertura);
    const zoom = ENCUADRE.escala * (1 + 0.05 * enfoque);
    const fu = fotoMaterial.uniforms;
    const recorrido = 0.025 * altoLienzo; // px que se mueve lo más cercano
    fu.paralaje.value.set(
      (mirada.x * recorrido) / anchoLienzo,
      (mirada.y * 0.6 * recorrido) / altoLienzo,
    );
    fu.zoom.value = zoom;
    fu.velo.value = 0.62 * enfoque;
    fu.desenfoque.value = 1.8 * enfoque;

    // Al abrirse, la cámara se aleja para que quepa todo; con una capa activa, se acerca un poco
    robot.updateMatrixWorld();
    const foco = activa && apertura > 0.5 ? centros.get(activa) : undefined;
    // Montado, del tamaño que tendría en esa mesa a esa distancia de la cámara de la foto
    let distanciaDestino = ancha ? 1.7 + apertura * 0.2 : 1.2 + apertura * 0.8;
    if (foco && activa) {
      miraDestino
        .copy(foco.centro)
        .add(modelo.piezas.get(activa)!.grupo.position)
        .applyMatrix4(robot.matrixWorld)
        .lerp(mira, 0.72);
      distanciaDestino *= foco.acercar;
    } else miraDestino.copy(mira);
    // El coche sigue a la mesa: se mueve lo mismo que la foto en el punto donde se apoya
    punto.set(0, SUELO, 0).project(camara);
    const [u, v] = puntoDeFoto(
      (punto.x + 1) / 2,
      (1 - punto.y) / 2,
      anchoLienzo,
      altoLienzo,
      ancha ? ENCUADRE.ancha : ENCUADRE.estrecha,
      zoom,
    );
    // (en el primer fotograma la cámara aún no está colocada: la cuenta sale NaN y se ignora)
    const relativa = Number.isFinite(u + v) ? cercaniaEn(u, v) - PIVOTE : 0;
    pegado.set(fu.paralaje.value.x * relativa, fu.paralaje.value.y * relativa);
    colocar(apertura);
    camara.updateProjectionMatrix();

    const paso = Math.min(1, dt * 2.2);
    miraAhora.lerp(miraDestino, paso);
    distancia += (distanciaDestino - distancia) * paso;
    // La cámara se desplaza con la mirada (gira un poco alrededor del coche y sube o baja)
    camara.position.copy(DESDE).applyAxisAngle(EJE_Y, mirada.x * 0.07);
    camara.position.y -= mirada.y * 0.25;
    camara.position.multiplyScalar(distancia).add(miraAhora);
    camara.lookAt(miraAhora);
    camara.updateMatrixWorld();

    if (alDibujar) {
      for (const [id, { centro }] of centros) {
        punto
          .copy(centro)
          .add(modelo.piezas.get(id)!.grupo.position)
          .applyMatrix4(robot.matrixWorld)
          .project(camara);
        anclas[id].x = ((punto.x + 1) / 2) * anchoLienzo;
        anclas[id].y = ((1 - punto.y) / 2) * altoLienzo;
      }
      alDibujar(anclas, apertura);
    }
    renderer.clear();
    renderer.render(fondo, camaraFondo);
    renderer.render(escena, camara);
  }
  await renderer.compileAsync(fondo, camaraFondo).catch(() => undefined);
  await renderer.compileAsync(escena, camara).catch(() => undefined);
  marco = requestAnimationFrame(dibujar);

  return {
    abrir(valor) {
      objetivo = Math.min(1, Math.max(0, valor));
    },
    enfocar(id) {
      activa = id;
    },
    calidad: () => nivel,
    pausar(valor) {
      if (valor === pausada) return;
      pausada = valor;
      cancelAnimationFrame(marco);
      if (!pausada && nivel !== "foto") {
        vigilante.reiniciar();
        anterior = performance.now();
        marco = requestAnimationFrame(dibujar);
      }
    },
    destruir() {
      cancelAnimationFrame(marco);
      observador.disconnect();
      window.removeEventListener("pointermove", alMoverRaton);
      modelo.liberar();
      fusionadas.forEach((x) => x.dispose());
      geometrias.forEach((x) => x.dispose());
      materiales.forEach((x) => x.dispose());
      texturas.forEach((x) => x.dispose());
      entorno.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
