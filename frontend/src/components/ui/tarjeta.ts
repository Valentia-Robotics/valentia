/**
 * EL ASPECTO COMÚN DE LAS FICHAS DE LA TIENDA (kits, componentes y piezas del configurador).
 * Estilo «industrial» (PROMPT_REDISENO.md): hoja técnica de línea fina sobre el carbón, esquinas
 * vivas, sin sombras. Al pasar el ratón el contorno se aclara y el fondo sube un tono, al instante
 * (respuesta mecánica, sin flotar). Lo que es del mismo tipo se ve igual (ley de semejanza).
 */
export const TARJETA_TIENDA =
  "relative border border-linea bg-panel transition-colors duration-150 hover:border-borde-fuerte hover:bg-panel-alto";

/** Pie de la ficha (precio + acción), separado por una línea fina: «lo que cuesta y qué hago» */
export const PIE_TARJETA = "mt-5 flex items-center justify-between gap-3 border-t border-linea pt-4";
