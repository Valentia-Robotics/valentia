import type { PiezaRobot } from "@/types/catalogo";

/** Tipos de producto que pueden ir en el carrito */
export type TipoArticulo = "kit" | "componente" | "configuracion";

/** Un artículo dentro del carrito */
export interface ArticuloCarrito {
  /** Identificador único dentro del carrito (por ejemplo "kit:coche-seguidor") */
  id: string;
  tipo: TipoArticulo;
  nombre: string;
  /**
   * Precio de UNA unidad, en céntimos y con IVA incluido.
   * Solo sirve para mostrarlo: al pagar, el servidor lo vuelve a calcular con la base de datos.
   */
  precioCentimos: number;
  cantidad: number;
  imagen?: string;
  /** Kit o componente: su slug */
  slug?: string;
  /** Robot personalizado: sus piezas */
  piezas?: PiezaRobot[];
  /** Texto extra opcional, por ejemplo la lista de piezas de una configuración */
  detalle?: string[];
}
