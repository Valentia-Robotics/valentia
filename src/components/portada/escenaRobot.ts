/**
 * ESCENA 3D DE LA PORTADA
 * El coche seguidor de líneas con sus piezas reales (modeloCoche.ts). Gira despacio y,
 * según avanza el scroll, se despieza en sus componentes y se vuelve a montar.
 *
 * Este archivo importa "three" (la librería 3D, bastante pesada), así que SOLO se carga
 * con import() desde PortadaRobot.tsx, cuando el navegador ya ha pintado la página.
 * No usa React: recibe un <canvas> y devuelve funciones para controlarlo.
 */
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  VSMShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SUELO, crearModeloCoche } from "./modeloCoche";
import { PIEZAS_ROBOT, explosionDesdeProgreso, piezaActiva } from "./piezasRobot";
import { texturaSombra } from "./texturasRobot";

/** Altura a la que se dibuja el coche (para que quede centrado en el lienzo) */
const ALTURA = 0.12;

export interface EscenaRobot {
  /** Avance del scroll por la sección, de 0 a 1 */
  ponerProgreso(progreso: number): void;
  /** Pausa el dibujo (por ejemplo, cuando la sección no se ve) */
  pausar(pausada: boolean): void;
  /** Libera la memoria de la tarjeta gráfica */
  destruir(): void;
}

/**
 * @param giroFijo ángulo fijo del coche (sin girar solo). Para hacer fotos del robot;
 *                 en la web se deja sin poner y el coche gira despacio.
 */
export function crearEscenaRobot(canvas: HTMLCanvasElement, giroFijo?: number): EscenaRobot {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = VSMShadowMap; // sombras de bordes suaves, como con luz de estudio

  const escena = new Scene();
  // Reflejos de una habitación neutra: así el metal, el plástico y el metacrilato parecen reales
  const pmrem = new PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environment = entorno;
  escena.environmentIntensity = 0.85;

  // Teleobjetivo suave (poco ángulo, desde lejos): menos deformación, como una foto de producto
  const camara = new PerspectiveCamera(21, 1, 0.1, 100);
  camara.position.set(5.6, 3.7, 6.75);
  camara.lookAt(0, 0.26, 0);

  escena.add(new HemisphereLight(0xffffff, 0xd9dce3, 0.45));
  const sol = new DirectionalLight(0xfff8f0, 1.9);
  sol.position.set(3, 7, 4);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.blurSamples = 16;
  sol.shadow.camera.left = sol.shadow.camera.bottom = -2.4;
  sol.shadow.camera.right = sol.shadow.camera.top = 2.4;
  sol.shadow.camera.near = 1;
  sol.shadow.camera.far = 16;
  sol.shadow.radius = 10;
  sol.shadow.bias = -0.0006;
  escena.add(sol);
  const contraluz = new DirectionalLight(0xe2e7ff, 0.7);
  contraluz.position.set(-5, 3, -4);
  escena.add(contraluz);

  // ---------- El coche ----------
  const modelo = crearModeloCoche();
  const robot = modelo.raiz;
  robot.position.y = ALTURA;
  escena.add(robot);

  // ---------- Suelo: sombra nítida del sol + una sombra suave debajo ----------
  const sueloGeo = new PlaneGeometry(8, 8);
  const sueloMat = new ShadowMaterial({ opacity: 0.16 });
  const suelo = new Mesh(sueloGeo, sueloMat);
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = SUELO + ALTURA - 0.002;
  suelo.receiveShadow = true;
  escena.add(suelo);
  const texturaDifusa = texturaSombra();
  const difusaGeo = new PlaneGeometry(4.4, 3.2);
  const difusaMat = new MeshBasicMaterial({
    map: texturaDifusa,
    transparent: true,
    depthWrite: false,
  });
  const difusa = new Mesh(difusaGeo, difusaMat);
  difusa.rotation.x = -Math.PI / 2;
  difusa.position.y = SUELO + ALTURA - 0.004;
  escena.add(difusa);

  // ---------- Tamaño del lienzo ----------
  function ajustarTamano() {
    const { clientWidth: ancho, clientHeight: alto } = canvas;
    if (!ancho || !alto) return;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    // En lienzos estrechos alejamos la cámara para que el robot quepa entero
    camara.zoom = Math.min(1, camara.aspect / 1.1);
    camara.updateProjectionMatrix();
  }
  const observador = new ResizeObserver(ajustarTamano);
  observador.observe(canvas);
  ajustarTamano();

  // ---------- Animación ----------
  let progreso = 0;
  let suave = 0; // progreso suavizado, para que el despiece no vaya a tirones
  let pausada = false;
  let marco = 0;
  let anterior = performance.now();
  let giro = 0;
  const destino = new Vector3();

  function dibujar(ahora: number) {
    marco = requestAnimationFrame(dibujar);
    const dt = Math.min((ahora - anterior) / 1000, 0.05);
    anterior = ahora;

    suave += (progreso - suave) * Math.min(1, dt * 6);
    const explosion = explosionDesdeProgreso(suave);
    const activa = piezaActiva(suave);

    giro = giroFijo ?? giro + dt * 0.25;
    robot.rotation.y = giro + suave * Math.PI * 1.2;
    robot.position.y = ALTURA + Math.sin(ahora / 900) * 0.03 * (1 - explosion);

    for (const pieza of PIEZAS_ROBOT) {
      const registro = modelo.piezas.get(pieza.id);
      if (!registro) continue;
      const [x, y, z] = pieza.direccion3d;
      destino.set(x * explosion, y * explosion, z * explosion);
      registro.grupo.position.lerp(destino, Math.min(1, dt * 8));
      // La pieza de la que hablamos se aclara un poco (con su propio color, sin teñirla)
      const brillo = activa === pieza.id ? 0.22 * explosion : 0;
      for (const m of registro.materiales) {
        if (m.emissiveIntensity > 1) continue; // luces propias (el LED verde)
        if (!m.map) m.emissive.copy(m.color);
        else m.emissive.setHex(0x808080);
        m.emissiveIntensity += (brillo - m.emissiveIntensity) * Math.min(1, dt * 6);
      }
    }

    // Los cables se desvanecen al despiezar: con las piezas separadas no tendrían sentido
    const opacidad = 1 - Math.min(1, explosion * 4);
    modelo.cables.grupo.visible = opacidad > 0.01;
    for (const m of modelo.cables.materiales) {
      m.transparent = opacidad < 1;
      m.opacity = opacidad;
    }

    renderer.render(escena, camara);
  }
  marco = requestAnimationFrame(dibujar);

  return {
    ponerProgreso(valor) {
      progreso = Math.min(1, Math.max(0, valor));
    },
    pausar(valor) {
      if (valor === pausada) return;
      pausada = valor;
      cancelAnimationFrame(marco);
      if (!pausada) {
        anterior = performance.now();
        marco = requestAnimationFrame(dibujar);
      }
    },
    destruir() {
      cancelAnimationFrame(marco);
      observador.disconnect();
      modelo.liberar();
      [sueloGeo, difusaGeo].forEach((g) => g.dispose());
      [sueloMat, difusaMat].forEach((m) => m.dispose());
      texturaDifusa.dispose();
      entorno.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
