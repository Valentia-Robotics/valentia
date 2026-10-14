import type { Categoria } from "@/generated/prisma/enums";

export type { Categoria };

/** Un dato técnico de la ficha, por ejemplo { nombre: "Giro", valor: "0 – 180°" } */
export interface Especificacion {
  nombre: string;
  valor: string;
}

/**
 * Un componente tal y como lo usan el configurador y la página /componentes.
 * Es una copia "plana" de la fila de la base de datos que se puede enviar al navegador.
 */
export interface ComponenteCatalogo {
  slug: string;
  nombre: string;
  categoria: Categoria;
  /** Tipo concreto (placa, motor-dc, servo, bateria…). Lo usan las reglas de compatibilidad. */
  tipo: string;
  resumen: string;
  descripcion: string;
  precioCentimos: number;
  stock: number;
  imagen: string;
  /** Voltios de funcionamiento (en una batería: los que entrega) */
  voltaje: number;
  /** Voltios de las señales (3,3 o 5), o null si no tiene señales */
  voltajeLogico: number | null;
  /** Miliamperios que consume (en una batería: los que puede dar como máximo) */
  consumoMa: number;
  conector: string;
  /** Pines que ocupa en la placa (en una placa: los que ofrece) */
  pines: number;
  especificaciones: Especificacion[];
}

/** Una pieza dentro de un robot o de un kit: qué componente y cuántas unidades */
export interface PiezaRobot {
  slug: string;
  cantidad: number;
}

/** Lo que necesita saber el configurador de cada kit para poder "empezar desde un kit" */
export interface KitParaConfigurador {
  slug: string;
  nombre: string;
  eslogan: string;
  imagen: string;
  precioCentimos: number;
  piezas: PiezaRobot[];
}
