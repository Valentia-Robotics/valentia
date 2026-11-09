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

/** Archivos que se pueden subir de una vez (se suben uno detrás de otro) */
export const MAXIMO_ARCHIVOS_DE_GOLPE = 20;

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
 * Carpeta escrita por la persona ("Coche VR1 / PCB") → "Coche VR1/PCB". Hasta 4 niveles de 60
 * caracteres; sin ".." ni caracteres raros. "" = sin carpeta. null si no es válida.
 */
export function limpiarCarpeta(carpeta: string): string | null {
  const partes = carpeta
    .split(/[\\/]/)
    .map((p) => p.normalize("NFC").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (partes.length > 4) return null;
  for (const p of partes) {
    if (p.length > 60 || /^\.+$/.test(p) || HAY_PROHIBIDOS.test(p)) return null;
  }
  return partes.join("/");
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
