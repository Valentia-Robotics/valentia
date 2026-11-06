/**
 * ZIP SENCILLO
 * Empaqueta varios archivos de texto en un .zip (comprimidos con "deflate", el formato estándar
 * que abre cualquier ordenador). Hecho a mano con zlib de Node para no añadir otra librería.
 */
import { deflateRawSync } from "node:zlib";

export interface ArchivoZip {
  nombre: string;
  contenido: string | Uint8Array;
}

// Tabla para calcular el CRC-32 (la "huella" que el ZIP guarda de cada archivo)
const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(datos: Uint8Array) {
  let c = 0xffffffff;
  for (const byte of datos) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Fecha y hora en el formato de MS-DOS que usa el ZIP */
function fechaDos(fecha: Date) {
  const hora = (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | (fecha.getSeconds() >> 1);
  const dia =
    ((Math.max(fecha.getFullYear(), 1980) - 1980) << 9) |
    ((fecha.getMonth() + 1) << 5) |
    fecha.getDate();
  return { hora, dia };
}

export function crearZip(archivos: ArchivoZip[], fecha = new Date()): Uint8Array {
  const { hora, dia } = fechaDos(fecha);
  const partes: Uint8Array[] = [];
  const directorio: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const archivo of archivos) {
    const nombre = new TextEncoder().encode(archivo.nombre);
    const datos =
      typeof archivo.contenido === "string"
        ? new TextEncoder().encode(archivo.contenido)
        : archivo.contenido;
    const comprimido = deflateRawSync(datos);
    const crc = crc32(datos);

    // Cabecera local de cada archivo
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // versión necesaria (2.0)
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint16(8, 8, true); // método: deflate
    local.setUint16(10, hora, true);
    local.setUint16(12, dia, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, comprimido.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombre.length, true);
    partes.push(new Uint8Array(local.buffer), nombre, comprimido);

    // Entrada del índice final
    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 8, true);
    central.setUint16(12, hora, true);
    central.setUint16(14, dia, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, comprimido.length, true);
    central.setUint32(24, datos.length, true);
    central.setUint16(28, nombre.length, true);
    central.setUint32(42, desplazamiento, true);
    directorio.push(new Uint8Array(central.buffer), nombre);

    desplazamiento += 30 + nombre.length + comprimido.length;
  }

  const tamDirectorio = directorio.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamDirectorio, true);
  fin.setUint32(16, desplazamiento, true);

  const todo = [...partes, ...directorio, new Uint8Array(fin.buffer)];
  const salida = new Uint8Array(todo.reduce((s, p) => s + p.length, 0));
  let i = 0;
  for (const p of todo) {
    salida.set(p, i);
    i += p.length;
  }
  return salida;
}
