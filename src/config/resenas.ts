/**
 * Reglas de las reseñas de los kits (decisión de Jesse, 24-10-2026).
 * Si algún día quieres revisarlas antes de que salgan, cambia `revisarAntesDePublicar` a true:
 * las nuevas esperarán en /admin/resenas hasta que pulses «Publicar».
 */
export const configResenas = {
  /** false = la reseña se ve en la tienda nada más escribirla (se puede ocultar desde el panel) */
  revisarAntesDePublicar: false,
  /** true = solo puede opinar quien ha activado el código QR de ese kit */
  soloClientes: true,
  /** Largo del comentario, en caracteres */
  textoMinimo: 10,
  textoMaximo: 1000,
  /** Cuántas reseñas se enseñan en la ficha del kit (las más recientes) */
  enLaFicha: 20,
} as const;
