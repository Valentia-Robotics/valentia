/**
 * ESCENA 3D DE LA PORTADA
 * Un robot (coche seguidor de líneas) hecho con formas geométricas sencillas.
 * Gira despacio y, según avanza el scroll, se despieza en sus componentes y se vuelve a montar.
 *
 * Este archivo importa "three" (la librería 3D, bastante pesada), así que SOLO se carga
 * con import() desde Robot3D.tsx, cuando el navegador ya ha pintado la página.
 * No usa React: recibe un <canvas> y devuelve funciones para controlarlo.
 */
import {
  AmbientLight,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  MeshBasicMaterial,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PIEZAS_ROBOT, explosionDesdeProgreso, piezaActiva } from "./piezasRobot";

/** Colores de la marca (los mismos que src/app/globals.css) */
const COLOR = {
  tinta: 0x0b0b0b,
  grafito: 0x1a1a1a,
  gris: 0x6b6b6b,
  niebla: 0xf4f4f2,
  blanco: 0xffffff,
  acento: 0x2d4bff,
  acentoClaro: 0x7a8cff,
};

export interface EscenaRobot {
  /** Avance del scroll por la sección, de 0 a 1 */
  ponerProgreso(progreso: number): void;
  /** Pausa el dibujo (por ejemplo, cuando la sección no se ve) */
  pausar(pausada: boolean): void;
  /** Libera la memoria de la tarjeta gráfica */
  destruir(): void;
}

/** Sombra suave bajo el robot: un círculo difuminado dibujado en un canvas 2D */
function texturaSombra() {
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 128;
  const ctx = lienzo.getContext("2d")!;
  const degradado = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  degradado.addColorStop(0, "rgba(11,11,11,0.35)");
  degradado.addColorStop(1, "rgba(11,11,11,0)");
  ctx.fillStyle = degradado;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(lienzo);
}

export function crearEscenaRobot(canvas: HTMLCanvasElement): EscenaRobot {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const escena = new Scene();
  const camara = new PerspectiveCamera(32, 1, 0.1, 100);
  camara.position.set(4.8, 3.2, 5.9);
  camara.lookAt(0, 0.15, 0);

  escena.add(new AmbientLight(COLOR.blanco, 1.1));
  const sol = new DirectionalLight(COLOR.blanco, 2.2);
  sol.position.set(4, 8, 5);
  escena.add(sol);
  const contraluz = new DirectionalLight(0xdfe4ff, 0.6);
  contraluz.position.set(-6, 3, -4);
  escena.add(contraluz);

  // Todo lo que creamos, para poder liberarlo al final
  const geometrias: BufferGeometry[] = [];
  const materiales: Material[] = [];
  const geo = <T extends BufferGeometry>(g: T) => (geometrias.push(g), g);
  const mat = (color: number, extra: Partial<MeshStandardMaterial> = {}) => {
    const m = new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...extra });
    materiales.push(m);
    return m;
  };

  const robot = new Group();
  escena.add(robot);

  /** Grupo de cada pieza (con su posición montada y su dirección al despiezarse) */
  const grupos = new Map<string, { grupo: Group; materiales: MeshStandardMaterial[] }>();
  const nuevaPieza = (id: string) => {
    const grupo = new Group();
    robot.add(grupo);
    const registro = { grupo, materiales: [] as MeshStandardMaterial[] };
    grupos.set(id, registro);
    return {
      grupo,
      malla(geometria: BufferGeometry, material: MeshStandardMaterial, x = 0, y = 0, z = 0) {
        const m = new Mesh(geometria, material);
        m.position.set(x, y, z);
        grupo.add(m);
        if (!registro.materiales.includes(material)) registro.materiales.push(material);
        return m;
      },
    };
  };

  // ---------- Chasis ----------
  {
    const p = nuevaPieza("chasis");
    p.malla(geo(new RoundedBoxGeometry(2.5, 0.22, 1.5, 4, 0.08)), mat(COLOR.grafito), 0, 0, 0);
    // Rueda loca delantera
    p.malla(
      geo(new SphereGeometry(0.12, 20, 16)),
      mat(COLOR.gris, { metalness: 0.6 }),
      0.95,
      -0.2,
      0,
    );
  }

  // ---------- Placa (el "cerebro") ----------
  {
    const p = nuevaPieza("placa");
    p.malla(
      geo(new RoundedBoxGeometry(1.15, 0.07, 0.85, 2, 0.02)),
      mat(COLOR.acento),
      0.1,
      0.32,
      0,
    );
    const chip = mat(COLOR.tinta, { roughness: 0.3 });
    p.malla(geo(new RoundedBoxGeometry(0.34, 0.06, 0.34, 2, 0.015)), chip, 0.15, 0.39, 0.05);
    const pequeno = geo(new RoundedBoxGeometry(0.14, 0.05, 0.1, 1, 0.01));
    p.malla(pequeno, chip, -0.3, 0.38, 0.25);
    p.malla(pequeno, chip, -0.3, 0.38, -0.25);
    // Fila de pines
    const pin = geo(new RoundedBoxGeometry(0.05, 0.08, 0.05, 1, 0.01));
    const dorado = mat(0xd8b65a, { metalness: 0.8, roughness: 0.3 });
    for (let i = 0; i < 9; i++) p.malla(pin, dorado, -0.32 + i * 0.09, 0.39, -0.36);
  }

  // ---------- Motores y ruedas ----------
  {
    const p = nuevaPieza("motores");
    const motor = geo(new CylinderGeometry(0.16, 0.16, 0.5, 24));
    const metal = mat(0xb9bcc4, { metalness: 0.7, roughness: 0.35 });
    for (const z of [-0.5, 0.5]) {
      const m = p.malla(motor, metal, -0.75, -0.24, z);
      m.rotation.x = Math.PI / 2;
    }
    const rueda = geo(new CylinderGeometry(0.42, 0.42, 0.2, 40));
    const llanta = geo(new CylinderGeometry(0.2, 0.2, 0.22, 24));
    const goma = mat(COLOR.tinta, { roughness: 0.9 });
    const centro = mat(COLOR.niebla);
    for (const z of [-0.88, 0.88]) {
      p.malla(rueda, goma, -0.75, -0.24, z).rotation.x = Math.PI / 2;
      p.malla(llanta, centro, -0.75, -0.24, z).rotation.x = Math.PI / 2;
    }
  }

  // ---------- Sensores (ultrasonidos delante y sensor de línea debajo) ----------
  {
    const p = nuevaPieza("sensores");
    p.malla(geo(new RoundedBoxGeometry(0.1, 0.32, 0.78, 2, 0.02)), mat(COLOR.acento), 1.3, 0.3, 0);
    const ojo = geo(new CylinderGeometry(0.13, 0.13, 0.16, 32));
    const plata = mat(0xdadde3, { metalness: 0.75, roughness: 0.25 });
    for (const z of [-0.2, 0.2]) {
      p.malla(ojo, plata, 1.4, 0.3, z).rotation.z = Math.PI / 2;
    }
    p.malla(
      geo(new RoundedBoxGeometry(0.3, 0.05, 0.9, 1, 0.015)),
      mat(COLOR.tinta),
      1.05,
      -0.16,
      0,
    );
  }

  // ---------- Batería ----------
  {
    const p = nuevaPieza("bateria");
    p.malla(geo(new RoundedBoxGeometry(0.7, 0.32, 0.6, 3, 0.05)), mat(COLOR.niebla), -0.8, 0.28, 0);
    p.malla(
      geo(new RoundedBoxGeometry(0.72, 0.06, 0.62, 2, 0.02)),
      mat(COLOR.acentoClaro),
      -0.8,
      0.36,
      0,
    );
    // Antena con luz
    p.malla(geo(new CylinderGeometry(0.02, 0.02, 0.6, 8)), mat(COLOR.tinta), -0.95, 0.72, -0.18);
    p.malla(
      geo(new SphereGeometry(0.07, 16, 12)),
      mat(COLOR.acentoClaro, { emissive: new Color(COLOR.acento), emissiveIntensity: 0.6 }),
      -0.95,
      1.04,
      -0.18,
    );
  }

  // Sombra en el suelo
  const texturas = [texturaSombra()];
  const materialSombra = new MeshBasicMaterial({
    map: texturas[0],
    transparent: true,
    depthWrite: false,
  });
  materiales.push(materialSombra);
  const sombra = new Mesh(geo(new PlaneGeometry(4.6, 3.4)), materialSombra);
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = -0.68;
  escena.add(sombra);

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

    giro += dt * 0.25;
    robot.rotation.y = giro + suave * Math.PI * 1.2;
    robot.position.y = Math.sin(ahora / 900) * 0.04;

    for (const pieza of PIEZAS_ROBOT) {
      const registro = grupos.get(pieza.id);
      if (!registro) continue;
      const [x, y, z] = pieza.direccion3d;
      destino.set(x * explosion, y * explosion, z * explosion);
      registro.grupo.position.lerp(destino, Math.min(1, dt * 8));
      // La pieza de la que hablamos se ilumina un poco
      const brillo = activa === pieza.id ? 0.35 * explosion : 0;
      for (const m of registro.materiales) {
        m.emissive.setHex(COLOR.acento);
        m.emissiveIntensity += (brillo - m.emissiveIntensity) * Math.min(1, dt * 6);
      }
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
      geometrias.forEach((g) => g.dispose());
      materiales.forEach((m) => m.dispose());
      texturas.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
