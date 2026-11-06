/**
 * Compatibilidad de piezas del configurador.
 *   reglas.ts    → las reglas (DATOS: edítalas aquí)
 *   comprobar.ts → el motor que las aplica
 *   tipos.ts     → la forma de las reglas y de los resultados
 */
export { coincide, comprobarRobot, requisitosDe } from "./comprobar";
export { reglas } from "./reglas";
export type { Aviso, Diagnostico, Medidor, Nivel, PiezaConDatos, Regla } from "./tipos";
