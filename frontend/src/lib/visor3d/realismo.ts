/**
 * REALISMO DEL 3D: lo que hace que el coche parezca fotografiado y no dibujado.
 *
 *  - realzarMateriales: cambia cada material «plano» por uno que se comporta como el de verdad:
 *      · placas y serigrafías → barniz brillante (la máscara de soldadura) con las pistas y letras en relieve;
 *      · goma de las ruedas → mate con una pelusa suave en los bordes (sheen);
 *      · plásticos y metales → rugosidad que no es igual en todos los puntos (huellas, microarañazos).
 *    Se sustituyen las instancias en las mallas y en las listas de la escena, así el brillo de la capa activa
 *    (emissive) sigue funcionando.
 *  - entornoDelTaller: un mapa de reflejos hecho con la propia foto del taller, para que el metal y los barnices
 *    reflejen la ventana y la madera de esa mesa y no un estudio genérico.
 *
 * Importa "three": solo desde escenas que ya se cargan con import().
 */
import {
  CanvasTexture,
  Color,
  EquirectangularReflectionMapping,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Material,
  type Mesh,
  type Object3D,
  type PMREMGenerator,
  type Texture,
} from "three";

/** Rugosidad con variaciones (verde = cuánto se multiplica la rugosidad del material, 0,8-1) */
function texturaRugosidad(): CanvasTexture {
  const lado = 256;
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext("2d")!;
  const datos = ctx.createImageData(lado, lado);
  let semilla = 11;
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < lado * lado; i++) {
    const v = 214 + azar() * 30;
    datos.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(datos, 0, 0);
  // Huellas y manchas suaves (más brillo donde se ha tocado)
  for (let i = 0; i < 14; i++) {
    const x = azar() * lado;
    const y = azar() * lado;
    const r = 12 + azar() * 34;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(170,170,170,0.5)");
    g.addColorStop(1, "rgba(170,170,170,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Microarañazos (rectas finas, un poco más ásperas)
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 60; i++) {
    const x = azar() * lado;
    const y = azar() * lado;
    const a = azar() * Math.PI;
    const l = 6 + azar() * 30;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  const t = new CanvasTexture(lienzo);
  t.colorSpace = NoColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** Qué es cada superficie, por cómo está definido su material (exportado para el test) */
export type Superficie = "placa" | "goma" | "metal" | "plastico" | "transparente";

export function tipoSuperficie(m: {
  transparent: boolean;
  metalness: number;
  roughness: number;
  conImagen: boolean;
  conRelieve: boolean;
}): Superficie {
  if (m.transparent) return "transparente";
  if (m.conRelieve) return "goma";
  if (m.metalness >= 0.8) return "metal";
  if (m.conImagen) return "placa";
  return "plastico";
}

/** De un material estándar, el mismo con las capas de un material físico (barniz, pelusa…) */
function aFisico(origen: MeshStandardMaterial): MeshPhysicalMaterial {
  const fisico = new MeshPhysicalMaterial();
  // copy() del estándar: el del físico leería clearcoat & co. del origen, que no los tiene
  MeshStandardMaterial.prototype.copy.call(fisico, origen);
  fisico.defines = { STANDARD: "", PHYSICAL: "" };
  return fisico;
}

export interface Realce {
  /** Materiales nuevos (para liberarlos al final) */
  materiales: Material[];
  texturas: Texture[];
}

/**
 * Cambia los materiales de `raiz` por los realistas. `listas` son las listas de materiales que guarda la
 * escena (las de cada capa y la de los cables): se actualizan con los nuevos.
 */
export function realzarMateriales(
  raiz: Object3D,
  listas: MeshStandardMaterial[][],
  { anisotropia = 8 }: { anisotropia?: number } = {},
): Realce {
  const rugosidad = texturaRugosidad();
  const nuevos = new Map<Material, MeshStandardMaterial>();

  const realzar = (m: Material): Material => {
    if (!(m instanceof MeshStandardMaterial)) return m;
    const hecho = nuevos.get(m);
    if (hecho) return hecho;
    if (m.map) m.map.anisotropy = anisotropia;
    const tipo = tipoSuperficie({
      transparent: m.transparent && m.opacity < 0.95,
      metalness: m.metalness,
      roughness: m.roughness,
      conImagen: Boolean(m.map),
      conRelieve: Boolean(m.bumpMap),
    });
    let nuevo: MeshStandardMaterial = m;
    if (tipo === "placa") {
      const f = aFisico(m);
      // Máscara de soldadura: barniz brillante encima del color mate; lo impreso, en relieve
      const blanda = m.roughness >= 0.7; // protoboard y conectores: plástico, casi sin barniz
      f.clearcoat = blanda ? 0.12 : 0.65;
      f.clearcoatRoughness = blanda ? 0.5 : 0.18;
      f.bumpMap = m.map;
      f.bumpScale = blanda ? 1.4 : 0.7;
      f.roughnessMap = rugosidad;
      nuevo = f;
    } else if (tipo === "goma") {
      const f = aFisico(m);
      f.sheen = 0.5;
      f.sheenRoughness = 0.85;
      f.sheenColor = new Color(0x6a6a6a);
      f.roughnessMap = rugosidad;
      nuevo = f;
    } else if (tipo === "metal" || tipo === "plastico") {
      // Mismo material, con la rugosidad que varía (no hace falta uno nuevo)
      if (!m.roughnessMap) {
        m.roughnessMap = rugosidad;
        m.needsUpdate = true;
      }
      if (tipo === "plastico" && m.roughness < 0.5) {
        // Plástico inyectado brillante (motores, llantas): un poco de barniz
        const f = aFisico(m);
        f.clearcoat = 0.3;
        f.clearcoatRoughness = 0.35;
        nuevo = f;
      }
    }
    nuevos.set(m, nuevo);
    return nuevo;
  };

  raiz.traverse((o) => {
    const malla = o as Mesh;
    if (!malla.isMesh) return;
    malla.material = Array.isArray(malla.material)
      ? malla.material.map(realzar)
      : realzar(malla.material);
  });
  for (const lista of listas)
    for (let i = 0; i < lista.length; i++) {
      const cambiado = nuevos.get(lista[i]);
      if (cambiado) lista[i] = cambiado;
    }

  return {
    materiales: [...nuevos.entries()].filter(([a, b]) => a !== b).map(([, b]) => b),
    texturas: [rugosidad],
  };
}

/**
 * Mapa de reflejos sacado de la foto del taller (una esfera alrededor del coche, en equirectangular):
 * la foto queda detrás del coche y, en espejo, detrás de la cámara; arriba la luz del techo y la ventana
 * de la izquierda (donde está la luz principal de la escena); abajo, la madera de la mesa.
 * `luz` es la dirección de esa ventana y `fondo` hacia dónde queda la foto (vistos desde el coche).
 */
export function entornoDelTaller(
  foto: CanvasImageSource & { width: number; height: number },
  pmrem: PMREMGenerator,
  { luz, fondo }: { luz: [number, number, number]; fondo: [number, number, number] },
): Texture {
  const ancho = 1024;
  const alto = 512;
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d")!;

  // Dirección → punto del equirectangular de three (u = atan2(z, x)/2π + ½, v desde arriba)
  const aPunto = ([x, y, z]: [number, number, number]) => {
    const l = Math.hypot(x, y, z) || 1;
    return [
      (Math.atan2(z / l, x / l) / (Math.PI * 2) + 0.5) * ancho,
      (0.5 - Math.asin(y / l) / Math.PI) * alto,
    ];
  };

  // Techo claro → pared → madera
  const cielo = ctx.createLinearGradient(0, 0, 0, alto);
  cielo.addColorStop(0, "#fbf7ef");
  cielo.addColorStop(0.42, "#d9cfc0");
  cielo.addColorStop(0.55, "#8a6a4a");
  cielo.addColorStop(1, "#3d2a1a");
  ctx.fillStyle = cielo;
  ctx.fillRect(0, 0, ancho, alto);

  // La foto, desenfocada, en la franja del horizonte (y su espejo enfrente); repetida a ±ancho para dar la vuelta
  const [uFondo] = aPunto(fondo);
  const anchoFoto = ancho * 0.42;
  const altoFoto = (anchoFoto * foto.height) / foto.width;
  const yFoto = alto * 0.5 - altoFoto * 0.62;
  ctx.filter = "blur(6px)";
  for (const [centro, espejo] of [
    [uFondo, false],
    [uFondo + ancho / 2, true],
  ] as const)
    for (const vuelta of [-ancho, 0, ancho]) {
      ctx.save();
      ctx.globalAlpha = espejo ? 0.55 : 0.9;
      ctx.translate(centro + vuelta, 0);
      if (espejo) ctx.scale(-1, 1);
      ctx.drawImage(foto, -anchoFoto / 2, yFoto, anchoFoto, altoFoto);
      ctx.restore();
    }
  ctx.filter = "none";

  // La ventana: un rectángulo muy claro con su halo (es lo que dibuja el brillo en los barnices)
  const [uLuz, vLuz] = aPunto(luz);
  for (const vuelta of [-ancho, 0, ancho]) {
    const x = uLuz + vuelta;
    const halo = ctx.createRadialGradient(x, vLuz, 0, x, vLuz, 150);
    halo.addColorStop(0, "rgba(255,250,240,0.95)");
    halo.addColorStop(1, "rgba(255,250,240,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(x - 150, vLuz - 150, 300, 300);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 44, vLuz - 34, 88, 68);
  }

  const equi = new CanvasTexture(lienzo);
  equi.colorSpace = SRGBColorSpace;
  equi.mapping = EquirectangularReflectionMapping;
  const entorno = pmrem.fromEquirectangular(equi).texture;
  equi.dispose();
  return entorno;
}
