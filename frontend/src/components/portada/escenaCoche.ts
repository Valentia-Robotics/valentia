/**
 * ESCENA 3D DE LA PORTADA: el coche VR1 con sus piezas reales (modeloCoche.ts), sobre un estudio de luz
 * cálida. Gira muy despacio y, mientras se baja por la portada, se abre en sus piezas y se vuelve a montar.
 *
 * Importa "three" (pesado): SOLO se carga con import() desde HeroCoche.tsx, cuando la página ya se ve.
 * No usa React: recibe un <canvas> y devuelve funciones para controlarlo.
 */
import {
  ACESFilmicToneMapping,
  Box3,
  Sphere,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShadowMaterial,
  Vector3,
  VSMShadowMap,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { fusionarMallas } from "./fusionarMallas";
import { SUELO, crearModeloCoche } from "./modeloCoche";
import { PIEZAS_ROBOT, type PiezaRobot } from "./piezasRobot";
import { texturaSombra } from "./texturasRobot";

/** Deja respirar al navegador entre paso y paso de la preparación (el scroll no se traba) */
const ceder = () => new Promise<void>((listo) => setTimeout(listo, 0));

export interface EscenaCoche {
  /** Cuánto está abierto el coche: 0 = montado, 1 = en piezas */
  abrir(valor: number): void;
  /** La pieza de la que se habla: la cámara se desliza hacia ella (null = vista general) */
  enfocar(id: PiezaRobot["id"] | null): void;
  /** Pausa el dibujo (cuando no se ve) */
  pausar(pausada: boolean): void;
  destruir(): void;
}

export async function crearEscenaCoche(
  canvas: HTMLCanvasElement,
  { ligero = false }: { ligero?: boolean } = {},
): Promise<EscenaCoche> {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, ligero ? 1.5 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = VSMShadowMap; // sombras de bordes suaves, como en un estudio

  const escena = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environment = entorno;
  escena.environmentIntensity = 0.9;
  await ceder();

  // Teleobjetivo (poco ángulo, desde lejos): sin deformar, como una foto de producto
  const camara = new PerspectiveCamera(20, 1, 0.1, 100);
  const mira = new Vector3(0, 0.05, 0);
  const desde = new Vector3(5.2, 2.6, 6.4);

  // Luz cálida de ventana + cielo suave + un contraluz frío que dibuja los bordes
  escena.add(new HemisphereLight(0xfffaf2, 0xd8d2c8, 0.5));
  const sol = new DirectionalLight(0xfff1e0, 2.1);
  sol.position.set(3.5, 7, 3);
  sol.castShadow = true;
  sol.shadow.mapSize.setScalar(ligero ? 1024 : 2048);
  sol.shadow.blurSamples = ligero ? 8 : 16;
  sol.shadow.radius = 7;
  sol.shadow.bias = -0.0006;
  Object.assign(sol.shadow.camera, {
    left: -2.6,
    right: 2.6,
    top: 2.6,
    bottom: -2.6,
    near: 1,
    far: 16,
  });
  escena.add(sol);
  const contraluz = new DirectionalLight(0xdfe6ff, 0.8);
  contraluz.position.set(-5, 3, -4);
  escena.add(contraluz);

  // El coche
  const modelo = crearModeloCoche();
  await ceder();
  const fusionadas = [...modelo.piezas.values(), modelo.cables].flatMap((p) =>
    fusionarMallas(p.grupo),
  );
  await ceder();
  const robot = modelo.raiz;
  escena.add(robot);

  // Centro y tamaño de cada pieza (montada), para deslizar la cámara hacia la que se explica
  const caja = new Box3();
  const esfera = new Sphere();
  robot.updateMatrixWorld(true);
  const radioTotal = caja.setFromObject(robot).getBoundingSphere(esfera).radius;
  const encuadres = new Map<string, { centro: Vector3; acercar: number }>();
  for (const [id, registro] of modelo.piezas) {
    caja.setFromObject(registro.grupo).getBoundingSphere(esfera);
    encuadres.set(id, {
      centro: esfera.center.clone(),
      // Las piezas pequeñas, un poco más cerca; el chasis, casi nada. Nunca un primerísimo plano.
      acercar: Math.min(0.97, Math.max(0.84, (esfera.radius / radioTotal) * 0.4 + 0.72)),
    });
  }

  // Suelo: la sombra nítida del sol y una sombra suave debajo (contacto con la mesa)
  const sueloGeo = new PlaneGeometry(80, 80);
  const sueloMat = new ShadowMaterial({ opacity: 0.2 });
  const suelo = new Mesh(sueloGeo, sueloMat);
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = SUELO - 0.002;
  suelo.receiveShadow = true;
  escena.add(suelo);
  const texturaDifusa = texturaSombra();
  const difusaGeo = new PlaneGeometry(4.4, 3.2);
  const difusaMat = new MeshBasicMaterial({
    map: texturaDifusa,
    transparent: true,
    depthWrite: false,
    opacity: 0.6,
  });
  const difusa = new Mesh(difusaGeo, difusaMat);
  difusa.rotation.x = -Math.PI / 2;
  difusa.position.y = SUELO - 0.004;
  escena.add(difusa);

  let ancha = true;
  let aperturaVista = -1;
  /** Mueve el encuadre: montado va a un lado del texto; abierto, más centrado para que quepa */
  function colocar(apertura = 0) {
    const { clientWidth: ancho, clientHeight: alto } = canvas;
    aperturaVista = apertura;
    if (ancha)
      camara.setViewOffset(
        ancho,
        alto,
        -ancho * (0.225 - 0.015 * apertura),
        alto * 0.01,
        ancho,
        alto,
      );
    else camara.setViewOffset(ancho, alto, 0, -alto * (0.17 - 0.07 * apertura), ancho, alto);
  }
  function ajustarTamano() {
    const { clientWidth: ancho, clientHeight: alto } = canvas;
    if (!ancho || !alto) return;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    // El lienzo ocupa toda la pantalla (sin bordes que se noten) y el coche se coloca donde no pisa
    // el texto: a la derecha en pantallas anchas y abajo en el móvil
    ancha = ancho >= 1024;
    camara.zoom = ancha ? 1.06 : Math.min(1, 1.04 * camara.aspect);
    colocar();
    camara.updateProjectionMatrix();
  }
  const observador = new ResizeObserver(ajustarTamano);
  observador.observe(canvas);
  ajustarTamano();

  let objetivo = 0;
  let apertura = 0; // suavizada, para que nunca vaya a tirones
  let pausada = false;
  let marco = 0;
  let anterior = performance.now();
  let giro = -0.35;
  let activa: PiezaRobot["id"] | null = null;
  const destino = new Vector3();
  const miraAhora = mira.clone();
  const miraDestino = new Vector3();
  let distancia = 1;
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function dibujar(ahora: number) {
    marco = requestAnimationFrame(dibujar);
    const dt = Math.min((ahora - anterior) / 1000, 0.05);
    anterior = ahora;

    apertura += (objetivo - apertura) * Math.min(1, dt * 4);
    // Montado gira muy despacio; abierto se queda casi quieto para poder mirar cada pieza
    if (!quieto) giro += dt * 0.12 * (1 - apertura * 0.85);
    robot.rotation.y = giro;

    for (const pieza of PIEZAS_ROBOT) {
      const registro = modelo.piezas.get(pieza.id);
      if (!registro) continue;
      const [x, y, z] = pieza.direccion3d;
      destino.set(x * apertura, y * apertura, z * apertura);
      registro.grupo.position.copy(destino);
    }

    // Los cables se desvanecen al abrirlo: con las piezas separadas no tendrían sentido
    const opacidad = 1 - Math.min(1, apertura * 4);
    modelo.cables.grupo.visible = opacidad > 0.01;
    for (const m of modelo.cables.materiales) {
      m.transparent = opacidad < 1;
      m.opacity = opacidad;
    }

    // Al abrirse, la cámara se aleja para que quepa todo; al hablar de una pieza, se desliza hacia ella
    const encuadre = activa && apertura > 0.5 ? encuadres.get(activa) : undefined;
    let distanciaDestino = 1 + apertura * (ancha ? 0.86 : 0.62);
    if (encuadre && activa) {
      robot.updateMatrixWorld();
      miraDestino
        .copy(encuadre.centro)
        .add(modelo.piezas.get(activa)!.grupo.position)
        .applyMatrix4(robot.matrixWorld)
        .lerp(mira, 0.6); // sin perder de vista el resto del coche
      distanciaDestino *= encuadre.acercar;
    } else {
      miraDestino.copy(mira);
    }
    if (Math.abs(apertura - aperturaVista) > 0.002) colocar(apertura);
    const paso = Math.min(1, dt * 1.8);
    miraAhora.lerp(miraDestino, paso);
    distancia += (distanciaDestino - distancia) * paso;
    camara.position.copy(desde).multiplyScalar(distancia).add(miraAhora);
    camara.lookAt(miraAhora);
    renderer.render(escena, camara);
  }
  await renderer.compileAsync(escena, camara).catch(() => undefined);
  marco = requestAnimationFrame(dibujar);

  return {
    abrir(valor) {
      objetivo = Math.min(1, Math.max(0, valor));
    },
    enfocar(id) {
      activa = id;
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
      fusionadas.forEach((g) => g.dispose());
      [sueloGeo, difusaGeo].forEach((g) => g.dispose());
      [sueloMat, difusaMat].forEach((m) => m.dispose());
      texturaDifusa.dispose();
      entorno.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
