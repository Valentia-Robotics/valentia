/**
 * ESPACIOS DE ARCHIVOS DEL EQUIPO DE HARDWARE: reglas (puras, sin BD).
 * Cada persona con el rol HARDWARE tiene su espacio en /hardware; los administradores los ven
 * todos en /admin/hardware. Nadie más.
 */

/** Tamaño máximo de cada archivo. Pasa entero por el servidor: no subirlo sin mirar la memoria de Render */
export const MAXIMO_MB_ARCHIVO = 50;
/** Lo que puede ocupar, como mucho, el espacio de una persona */
export const CUOTA_GB_PERSONA = 2;

export const MAXIMO_BYTES_ARCHIVO = MAXIMO_MB_ARCHIVO * 1024 * 1024;
export const CUOTA_BYTES_PERSONA = CUOTA_GB_PERSONA * 1024 * 1024 * 1024;

/** Archivos sueltos que se pueden subir de una vez (se suben uno detrás de otro) */
export const MAXIMO_ARCHIVOS_DE_GOLPE = 20;
/** Archivos de una carpeta entera (con sus subcarpetas) que se pueden subir de una vez */
export const MAXIMO_ARCHIVOS_CARPETA = 500;
/** Niveles de carpeta (una dentro de otra) que se admiten */
export const MAXIMO_NIVELES_CARPETA = 8;

/** Caracteres que no valen en nombres de archivo (Windows, Mac y Linux) ni en carpetas */
const NO_PERMITIDOS = /[\u0000-\u001f\u007f<>:"/\\|?*]/g;
/** La misma lista, sin "g" (con "g", test() recuerda dónde se quedó y falla a la siguiente) */
const HAY_PROHIBIDOS = /[\u0000-\u001f\u007f<>:"/\\|?*]/;

/**
 * Nombre de archivo seguro para guardar y descargar: sin rutas ni caracteres raros, sin puntos
 * al principio y como mucho 150 caracteres (conservando la extensión). Vacío → "archivo".
 */
export function limpiarNombreArchivo(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? "";
  let limpio = base.normalize("NFC").replace(NO_PERMITIDOS, "_").replace(/\s+/g, " ").trim();
  limpio = limpio.replace(/^\.+/, "").trim();
  if (limpio.length > 150) {
    const punto = limpio.lastIndexOf(".");
    const extension = punto > 0 && limpio.length - punto <= 12 ? limpio.slice(punto) : "";
    limpio = limpio.slice(0, 150 - extension.length).trim() + extension;
  }
  return limpio || "archivo";
}

/**
 * Carpeta escrita por la persona ("Coche VR1 / PCB") → "Coche VR1/PCB". Hasta 8 niveles de 60
 * caracteres; sin ".." ni caracteres raros. "" = sin carpeta. null si no es válida.
 */
export function limpiarCarpeta(carpeta: string): string | null {
  const partes = carpeta
    .split(/[\\/]/)
    .map((p) => p.normalize("NFC").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (partes.length > MAXIMO_NIVELES_CARPETA) return null;
  for (const p of partes) {
    if (p.length > 60 || /^\.+$/.test(p) || HAY_PROHIBIDOS.test(p)) return null;
  }
  return partes.join("/");
}

/**
 * Archivos que el ordenador mete solo en las carpetas y no hace falta subir: ocultos (empiezan por
 * punto, como .DS_Store o todo lo de .git), Thumbs.db, desktop.ini y los temporales de Office (~$…).
 * `ruta` es la ruta dentro de la carpeta elegida ("Coche/PCB/placa.kicad_pcb").
 */
export function esArchivoDelSistema(ruta: string): boolean {
  const partes = ruta.split(/[\\/]/).filter(Boolean);
  const nombre = partes.at(-1) ?? "";
  return (
    partes.some((p) => p.startsWith(".")) ||
    /^(thumbs\.db|desktop\.ini)$/i.test(nombre) ||
    nombre.startsWith("~$")
  );
}

/**
 * Al subir una carpeta entera: en qué carpeta del espacio va cada archivo. Junta la carpeta escrita
 * en el formulario (`base`) con las carpetas de su ruta ("Coche/PCB/placa.kicad_pcb" → "Coche/PCB").
 * Los caracteres que no valen se cambian por "_" y los nombres largos se recortan. null si queda
 * demasiado profunda o la base no vale (la misma regla que comprueba el servidor).
 */
export function carpetaDeRuta(base: string, ruta: string): string | null {
  const carpetas = ruta
    .split(/[\\/]/)
    .slice(0, -1)
    .map((p) =>
      p
        .normalize("NFC")
        .replace(NO_PERMITIDOS, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60)
        .trim(),
    )
    .map((p) => (/^\.+$/.test(p) ? "_" : p))
    .filter(Boolean);
  return limpiarCarpeta([base, ...carpetas].join("/"));
}

/** 1536 → "1,5 KB"; 52428800 → "50 MB" */
export function tamanoLegible(bytes: number): string {
  const unidades = ["bytes", "KB", "MB", "GB"];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  const numero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: i === 0 ? 0 : 1 });
  return `${numero.format(valor)} ${unidades[i]}`;
}

/**
 * Cabecera Content-Disposition para descargar con el nombre original (con acentos incluidos):
 * versión sencilla para navegadores antiguos y versión UTF-8 (RFC 5987) para los demás.
 */
export function cabeceraDescarga(nombre: string): string {
  const sencillo = nombre.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${sencillo}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}

/** Una subcarpeta tal como se ve en el explorador: su nombre, su ruta completa y lo que lleva dentro */
export interface ResumenCarpeta {
  nombre: string;
  ruta: string;
  /** Archivos que hay dentro, contando los de sus subcarpetas */
  archivos: number;
  bytes: number;
}

const ordenNatural = new Intl.Collator("es-ES", { numeric: true, sensitivity: "base" });

/**
 * Lo que se ve al abrir una carpeta en el explorador del espacio ("" = la carpeta principal):
 * sus subcarpetas (solo el primer nivel, con lo que llevan dentro) y sus archivos sueltos.
 * Una carpeta existe si tiene algún archivo dentro, aunque sea en una subcarpeta suya.
 */
export function verCarpeta<T extends { carpeta: string; tamano: number; nombre: string }>(
  todos: T[],
  ruta: string,
): { carpetas: ResumenCarpeta[]; archivos: T[] } {
  const prefijo = ruta ? `${ruta}/` : "";
  const carpetas = new Map<string, ResumenCarpeta>();
  const archivos: T[] = [];
  for (const archivo of todos) {
    if (archivo.carpeta === ruta) {
      archivos.push(archivo);
      continue;
    }
    if (!archivo.carpeta.startsWith(prefijo)) continue;
    const nombre = archivo.carpeta.slice(prefijo.length).split("/")[0];
    const resumen = carpetas.get(nombre) ?? {
      nombre,
      ruta: prefijo + nombre,
      archivos: 0,
      bytes: 0,
    };
    resumen.archivos++;
    resumen.bytes += archivo.tamano;
    carpetas.set(nombre, resumen);
  }
  return {
    carpetas: [...carpetas.values()].sort((a, b) => ordenNatural.compare(a.nombre, b.nombre)),
    archivos: archivos.sort((a, b) => ordenNatural.compare(a.nombre, b.nombre)),
  };
}

/** "Coche/PCB" → [{ nombre: "Coche", ruta: "Coche" }, { nombre: "PCB", ruta: "Coche/PCB" }] */
export function migasDeCarpeta(ruta: string): { nombre: string; ruta: string }[] {
  const partes = ruta.split("/").filter(Boolean);
  return partes.map((nombre, i) => ({ nombre, ruta: partes.slice(0, i + 1).join("/") }));
}
