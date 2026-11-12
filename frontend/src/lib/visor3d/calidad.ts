/**
 * CALIDAD DEL 3D SEGÚN EL APARATO
 *
 * El mismo coche 3D tiene que verse lo mejor posible en un ordenador potente y no ir a tirones en un móvil
 * antiguo. Aquí se decide (sin three: reglas puras, con test):
 *  - con qué calidad empezar, según la pantalla, la memoria, los núcleos y la tarjeta gráfica;
 *  - qué cambia en cada nivel (resolución, sombras, reflejos del taller, relieve de las placas);
 *  - cuándo bajar un nivel si, ya en marcha, los fotogramas tardan demasiado.
 * Por debajo de «baja» está «foto»: la portada enseña la imagen fija del coche en lugar del 3D.
 */

export type NivelCalidad = "alta" | "media" | "baja" | "foto";
export type Nivel3D = Exclude<NivelCalidad, "foto">;

export interface DatosAparato {
  /** Ancho de la ventana en px CSS */
  ancho: number;
  /** navigator.deviceMemory (GB; solo Chrome/Edge/Android, y como mucho 8) */
  memoria?: number;
  /** navigator.hardwareConcurrency */
  nucleos?: number;
  /** Pantalla táctil sin ratón (móvil o tableta) */
  tactil: boolean;
  /** Nombre de la tarjeta gráfica (WEBGL_debug_renderer_info), si el navegador lo da */
  gpu?: string;
  /** El usuario ha pedido ahorrar datos (navigator.connection.saveData) */
  ahorroDatos?: boolean;
}

export interface AjustesCalidad {
  /** Tope de la densidad de píxeles (2 = nítido en pantallas retina; 1 = la mitad de trabajo o menos) */
  pixeles: number;
  /** Sombras de la luz de la ventana */
  sombras: boolean;
  /** Tamaño del mapa de sombras (px) y muestras de su desenfoque */
  mapaSombras: number;
  muestrasSombra: number;
  /** Reflejos sacados de la propia foto del taller (si no, un estudio genérico) */
  reflejosTaller: boolean;
  /** Barniz brillante de las placas, relieve de pistas y serigrafía, goma con pelusa… */
  materialesFinos: boolean;
  /** Filtrado de texturas en ángulo (las serigrafías no se emborronan de lado) */
  anisotropia: number;
}

export const AJUSTES_CALIDAD: Record<Nivel3D, AjustesCalidad> = {
  alta: {
    pixeles: 2,
    sombras: true,
    mapaSombras: 2048,
    muestrasSombra: 16,
    reflejosTaller: true,
    materialesFinos: true,
    anisotropia: 16,
  },
  media: {
    pixeles: 1.5,
    sombras: true,
    mapaSombras: 1024,
    muestrasSombra: 8,
    reflejosTaller: true,
    materialesFinos: true,
    anisotropia: 8,
  },
  baja: {
    pixeles: 1,
    sombras: false,
    mapaSombras: 512,
    muestrasSombra: 4,
    reflejosTaller: false,
    materialesFinos: false,
    anisotropia: 2,
  },
};

/** El nivel de debajo (de «baja» se pasa a la foto fija) */
export const NIVEL_INFERIOR: Record<Nivel3D, NivelCalidad> = {
  alta: "media",
  media: "baja",
  baja: "foto",
};

/** Dibujo por programa, sin tarjeta gráfica: el 3D iría a 2-5 fotogramas por segundo */
const GPU_SIN_TARJETA = /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i;
/** Gráficas de gama baja o de hace muchos años (móviles y portátiles baratos) */
const GPU_FLOJA =
  /mali-[24]\d\d|mali-t[678]\d\d|adreno \(tm\) [345]\d\d|powervr sgx|intel\(r\) hd graphics|intel\(r\) gma|videocore/i;
/** Gráficas integradas normales (portátiles de oficina): valen, pero sin lo más caro */
const GPU_INTEGRADA = /intel|uhd|iris|mali|adreno|powervr|vivante|apple gpu/i;

/** Con qué calidad empezar en este aparato */
export function elegirCalidad(d: DatosAparato): NivelCalidad {
  const gpu = d.gpu ?? "";
  if (GPU_SIN_TARJETA.test(gpu)) return "foto";
  if (GPU_FLOJA.test(gpu)) return "baja";
  if ((d.memoria !== undefined && d.memoria <= 2) || (d.nucleos !== undefined && d.nucleos <= 2))
    return "baja";
  if (d.ahorroDatos) return "baja";
  // Móviles y tabletas: como mucho «media» (pantallas muy densas que calentarían el teléfono)
  if (d.tactil || d.ancho < 768) return "media";
  if (d.memoria !== undefined && d.memoria <= 4) return "media";
  // «Apple M1/M2…» y las dedicadas (GeForce, Radeon RX, Arc) van en alta; el resto de integradas, media
  if (/apple m\d|geforce|rtx|radeon( pro)? (rx|\d{3,4}m?)|arc\b/i.test(gpu)) return "alta";
  if (GPU_INTEGRADA.test(gpu)) return "media";
  return "alta";
}

/**
 * VIGILANTE DEL RITMO: si los fotogramas tardan de media más de lo que se acepta, toca bajar un nivel.
 * Se espera a que pase el arranque (se compilan sombreadores y se suben texturas: los primeros
 * fotogramas siempre son lentos) y se ignoran los saltos enormes (pestaña escondida, pausa).
 */
export const RITMO = {
  /** Fotogramas de calentamiento que no cuentan */
  calentamiento: 45,
  /** Fotogramas que se miden de cada vez */
  ventana: 60,
  /** Más de esto de media (ms) = va a tirones (≈ 36 fotogramas por segundo) */
  maximoMedio: 28,
  /** Un fotograma suelto de más de esto no es lentitud: la pestaña estaba escondida o se paró */
  salto: 250,
  /** Pero tres seguidos así sí: el aparato no puede con el 3D (va a 4 fotogramas por segundo o menos) */
  saltosSeguidos: 3,
} as const;

export interface Vigilante {
  /** Apunta lo que tardó un fotograma; devuelve true si toca bajar de calidad */
  apuntar(ms: number): boolean;
  /** Empieza de cero (tras cambiar de nivel o volver a la pestaña) */
  reiniciar(): void;
}

export function crearVigilante(r: typeof RITMO = RITMO): Vigilante {
  let vistos = 0;
  let suma = 0;
  let contados = 0;
  let saltos = 0;
  return {
    apuntar(ms) {
      if (ms > r.salto) {
        if (++saltos < r.saltosSeguidos) return false;
        saltos = 0;
        vistos = suma = contados = 0;
        return true;
      }
      saltos = 0;
      vistos++;
      if (vistos <= r.calentamiento) return false;
      suma += ms;
      contados++;
      if (contados < r.ventana) return false;
      const lento = suma / contados > r.maximoMedio;
      suma = 0;
      contados = 0;
      if (lento) vistos = 0; // tras bajar, otro calentamiento
      return lento;
    },
    reiniciar() {
      saltos = 0;
      vistos = 0;
      suma = 0;
      contados = 0;
    },
  };
}

/** Lee del navegador los datos del aparato (solo en el cliente) */
export function datosDelAparato(): DatosAparato {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  let gpu: string | undefined;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    if (gl && info) gpu = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    gpu = undefined;
  }
  return {
    ancho: window.innerWidth,
    memoria: nav.deviceMemory,
    nucleos: nav.hardwareConcurrency,
    tactil: window.matchMedia("(pointer: coarse)").matches,
    gpu,
    ahorroDatos: nav.connection?.saveData === true,
  };
}
