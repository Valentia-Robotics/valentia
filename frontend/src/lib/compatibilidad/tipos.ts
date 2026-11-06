/**
 * Tipos de las reglas de compatibilidad.
 * Las reglas en sí están en reglas.ts; aquí solo se describe su "forma".
 */
import type { Categoria, ComponenteCatalogo } from "@/types/catalogo";

/** Gravedad de un aviso: error = no funcionará · aviso = puede dar problemas · info = consejo */
export type Nivel = "error" | "aviso" | "info";

/**
 * Elige un grupo de piezas del robot.
 * - tipos: solo piezas de estos tipos (placa, servo, bateria…)
 * - categorias: solo piezas de estas categorías
 * - excepto: quita estos tipos aunque coincidan con lo anterior
 * Si no pones ni "tipos" ni "categorias", elige todas las piezas.
 */
export interface Selector {
  tipos?: string[];
  categorias?: Categoria[];
  excepto?: string[];
}

interface ReglaBase {
  /** Identificador único de la regla (no se muestra) */
  id: string;
  nivel: Nivel;
  /** Titular corto del aviso */
  titulo: string;
  /** Explicación. Puede llevar huecos entre llaves, como {piezas}, que se rellenan solos. */
  mensaje: string;
  /** slug de un componente que arregla el problema (aparece un botón para añadirlo) */
  sugerencia?: string;
}

/**
 * "Unas piezas necesitan otras". Ejemplo: un motor necesita un driver.
 * Huecos del mensaje: {piezas}, {cantidad}, {necesarias}, {tienes}
 */
export interface ReglaNecesita extends ReglaBase {
  tipo: "necesita";
  si: Selector;
  necesita: Selector;
  /** Opcional: cuántas piezas de "si" puede atender cada pieza de "necesita" (un driver mueve 2 motores) */
  unoPorCada?: number;
  /** Texto corto que se muestra en la ficha de la pieza, en "Para que funcione" */
  requisito?: string;
}

/**
 * "No pongas más de X piezas de un tipo". Ejemplo: una sola placa.
 * Huecos del mensaje: {cantidad}, {maximo}
 */
export interface ReglaMaximo extends ReglaBase {
  tipo: "maximo";
  si: Selector;
  maximo: number;
}

/**
 * Compara los voltios de unas piezas con los de su "fuente" (la placa o la batería).
 * - caso "exceso": la fuente da MÁS voltios de los que aguanta la pieza
 * - caso "defecto": la fuente da MENOS voltios de los que necesita la pieza
 * "margen" es la tolerancia (0,25 = un 25 % arriba o abajo).
 * Huecos del mensaje: {piezas}, {fuente}, {voltajePieza}, {voltajeFuente}
 */
export interface ReglaVoltaje extends ReglaBase {
  tipo: "voltaje";
  piezas: Selector;
  fuente: Selector;
  campo: "voltaje" | "voltajeLogico";
  caso: "exceso" | "defecto";
  margen: number;
}

/**
 * "Lo que se gasta no puede superar lo que hay". Ejemplo: pines de la placa o corriente de la batería.
 * Se comprueban los umbrales de mayor a menor y se muestra solo el primero que se cumpla.
 * Huecos del mensaje: {usados}, {disponibles}, {porcentaje}, {unidad}
 */
export interface ReglaCapacidad {
  tipo: "capacidad";
  id: string;
  /** Nombre del medidor que se muestra en el panel "Tu robot" */
  etiqueta: string;
  unidad: string;
  campo: "pines" | "consumoMa";
  /** Piezas que ofrecen la capacidad (la placa da pines; la batería da corriente) */
  proveedor: Selector;
  /** "sumar" = se suman todos los proveedores · "mayor" = solo cuenta el mayor */
  combinar: "sumar" | "mayor";
  /** Piezas que gastan la capacidad */
  consumidor: Selector;
  /** Ejemplo: desde 1 = al llegar al 100 % · desde 0,8 = al llegar al 80 % */
  umbrales: (Omit<ReglaBase, "id"> & { desde: number })[];
}

export type Regla = ReglaNecesita | ReglaMaximo | ReglaVoltaje | ReglaCapacidad;

/* ---------- Lo que devuelve la comprobación ---------- */

/** Una pieza del robot con todos sus datos */
export interface PiezaConDatos {
  componente: ComponenteCatalogo;
  cantidad: number;
}

/** Un aviso listo para mostrar */
export interface Aviso {
  id: string;
  nivel: Nivel;
  titulo: string;
  mensaje: string;
  sugerencia?: string;
}

/** Barra de "cuánto llevas gastado" (pines, corriente…) */
export interface Medidor {
  id: string;
  etiqueta: string;
  unidad: string;
  usados: number;
  disponibles: number;
}

export interface Diagnostico {
  /** Ordenados de más grave a menos grave */
  avisos: Aviso[];
  medidores: Medidor[];
  errores: number;
  advertencias: number;
}
