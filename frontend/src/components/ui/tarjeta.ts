/**
 * EL ASPECTO COMÚN DE LAS TARJETAS DE LA TIENDA (kits, componentes y piezas del configurador).
 * Ley de semejanza (Gestalt): lo que es del mismo tipo se ve y se mueve igual, así se reconoce de un
 * vistazo como «algo que se puede abrir o comprar». Borde muy fino y, al pasar el ratón, se levanta un poco con
 * una sombra suave (como un objeto sobre la mesa).
 */
export const TARJETA_TIENDA =
  "rounded-tarjeta bg-white ring-1 ring-tinta/8 transition-[box-shadow,translate] duration-500 hover:-translate-y-1 hover:shadow-posada active:translate-0 motion-reduce:hover:translate-0";

/**
 * Pie de la tarjeta (precio + acción). Ley de región común: una línea fina lo separa de la
 * descripción y lo agrupa como «lo que cuesta y qué hago».
 */
export const PIE_TARJETA =
  "mt-5 flex items-center justify-between gap-3 border-t border-tinta/10 pt-4";
