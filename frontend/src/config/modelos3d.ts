/**
 * MODELOS 3D DE LOS COMPONENTES (visor del configurador y de la ficha de cada pieza)
 *
 * Cómo se añade uno (no hace falta tocar la base de datos):
 *   1. Guardar el archivo en `public/modelos/componentes/` con el slug de la pieza como nombre:
 *      `esp32-devkit.glb`, `servo-mg996r.stl`, `motor-dc-reductora.obj` (+ su `.mtl` si lo tiene).
 *   2. Listo: la web lo encuentra sola (src/lib/modelos3d.ts). Si no hay archivo, se ve la foto de siempre.
 *   3. Opcional: si sale girado, de otro color o con un tamaño raro, añadir una línea en AJUSTES_MODELOS (abajo).
 *
 * Mejor .glb (lleva colores y pesa poco). Un .stl no tiene color: se pinta con el color de AJUSTES_MODELOS o
 * con el gris de plástico mate por defecto. Las medidas se leen del propio archivo: hay que exportarlo en
 * milímetros (si viene en otra unidad, ponerla en `unidad`).
 */

/** Formatos que sabe abrir el visor */
export const FORMATOS_3D = ["glb", "gltf", "stl", "obj"] as const;
export type Formato3D = (typeof FORMATOS_3D)[number];

/** Unidad en la que se exportó el archivo (las medidas de la web siempre salen en milímetros) */
export type Unidad3D = "mm" | "cm" | "m" | "in";

const MM_POR_UNIDAD: Record<Unidad3D, number> = { mm: 1, cm: 10, m: 1000, in: 25.4 };

/** Ajustes opcionales de un modelo */
export interface AjustesModelo3D {
  /** Unidad del archivo (por defecto, milímetros) */
  unidad?: Unidad3D;
  /** Color para los archivos sin color (.stl, .obj sin .mtl), en hexadecimal */
  color?: string;
  /** Acabado: 0 = mate, 1 = muy brillante (por defecto 0,35) */
  brillo?: number;
  /** true = metálico (tornillos, carcasas de aluminio) */
  metal?: boolean;
  /** Giro en grados [x, y, z] si el archivo sale tumbado (CAD suele usar Z hacia arriba: [-90, 0, 0]) */
  giro?: [number, number, number];
}

/** El modelo de una pieza, tal y como llega al navegador */
export interface Modelo3D {
  /** Dirección pública del archivo, por ejemplo /modelos/componentes/esp32-devkit.glb */
  url: string;
  formato: Formato3D;
  /** Dirección del .mtl (colores de un .obj), si existe */
  mtl: string | null;
  /** Milímetros por cada unidad del archivo */
  escalaMm: number;
  color: string;
  brillo: number;
  metal: boolean;
  /** Giro en radianes [x, y, z] */
  giro: [number, number, number];
}

/** Carpeta pública (dentro de `public/`) donde van los modelos de los componentes */
export const CARPETA_MODELOS = "modelos/componentes";
/** Los kits montados (ficha de cada kit): public/modelos/kits/<slug del kit>.glb */
export const CARPETA_MODELOS_KITS = "modelos/kits";

/** Color por defecto de un archivo sin color: gris grafito de plástico mate */
export const COLOR_POR_DEFECTO = "#3a3d42";

/**
 * Ajustes por slug. Ejemplo:
 *   "servo-mg996r": { color: "#1b1b1d", giro: [-90, 0, 0] },
 */
export const AJUSTES_MODELOS: Record<string, AjustesModelo3D> = {};

/** El formato de un nombre de archivo («Servo.STL» → "stl"), o null si el visor no lo abre */
export function formatoDeArchivo(nombre: string): Formato3D | null {
  const extension = nombre.split(".").pop()?.toLowerCase() ?? "";
  return (FORMATOS_3D as readonly string[]).includes(extension) ? (extension as Formato3D) : null;
}

/**
 * De la lista de archivos de la carpeta, el modelo de cada slug. Si una pieza tiene varios, gana el
 * mejor formato (glb antes que gltf, obj y stl). Los .mtl acompañan al .obj del mismo nombre.
 */
export function modelosDeArchivos(
  archivos: string[],
  ajustes: Record<string, AjustesModelo3D> = AJUSTES_MODELOS,
  carpeta: string = CARPETA_MODELOS,
): Map<string, Modelo3D> {
  const preferencia: Formato3D[] = ["glb", "gltf", "obj", "stl"];
  const porSlug = new Map<string, { archivo: string; formato: Formato3D }>();
  const mtl = new Set<string>();

  for (const archivo of archivos) {
    const slug = archivo.replace(/\.[^.]+$/, "");
    // Solo nombres limpios (los slugs): nada de espacios, rutas ni archivos ocultos
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) continue;
    if (archivo.toLowerCase().endsWith(".mtl")) {
      mtl.add(slug);
      continue;
    }
    const formato = formatoDeArchivo(archivo);
    if (!formato) continue;
    const actual = porSlug.get(slug);
    if (!actual || preferencia.indexOf(formato) < preferencia.indexOf(actual.formato)) {
      porSlug.set(slug, { archivo, formato });
    }
  }

  const modelos = new Map<string, Modelo3D>();
  for (const [slug, { archivo, formato }] of porSlug) {
    const a = ajustes[slug] ?? {};
    const mtlArchivo =
      formato === "obj" && mtl.has(slug)
        ? archivos.find((x) => x.toLowerCase() === `${slug}.mtl`)
        : null;
    modelos.set(slug, {
      url: `/${carpeta}/${archivo}`,
      formato,
      mtl: mtlArchivo ? `/${carpeta}/${mtlArchivo}` : null,
      escalaMm: MM_POR_UNIDAD[a.unidad ?? "mm"],
      color: a.color ?? COLOR_POR_DEFECTO,
      brillo: Math.min(Math.max(a.brillo ?? 0.35, 0), 1),
      metal: a.metal ?? false,
      giro: (a.giro ?? [0, 0, 0]).map((g) => (g * Math.PI) / 180) as [number, number, number],
    });
  }
  return modelos;
}

/** Medidas de una pieza en milímetros, redondeadas como se dicen («51 × 28 × 13 mm», «0,8 mm») */
export function textoMedida(mm: number): string {
  const redondo = mm >= 10 ? Math.round(mm) : Math.round(mm * 10) / 10;
  return `${redondo.toLocaleString("es-ES")} mm`;
}
