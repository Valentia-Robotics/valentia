/**
 * NOMBRE LEGIBLE DE UN DISPOSITIVO
 * Convierte la "firma" del navegador (user-agent) en algo como "Chrome en Windows".
 * No hace falta que sea perfecto: solo ayuda a reconocer el dispositivo en "Mis dispositivos".
 */

/** El orden importa: Edge y Opera también dicen "Chrome", y Chrome también dice "Safari" */
const NAVEGADORES: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SISTEMAS: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "Mac"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

export function nombreDispositivo(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const navegador = NAVEGADORES.find(([patron]) => patron.test(ua))?.[1];
  const sistema = SISTEMAS.find(([patron]) => patron.test(ua))?.[1];
  if (navegador && sistema) return `${navegador} en ${sistema}`;
  return navegador ?? sistema ?? "Dispositivo desconocido";
}
