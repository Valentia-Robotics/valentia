/**
 * Después de cambiar el catálogo desde el panel, la tienda tiene que enseñarlo al momento.
 * Algunas páginas (portada, /kits, fichas de kit, /componentes) se guardan ya preparadas
 * para que carguen rápido: esto las vuelve a generar en la siguiente visita.
 */
import "server-only";
import { revalidatePath } from "next/cache";

export function refrescarTienda() {
  // "layout" en la raíz = todas las páginas de la web (tienda, configurador, cursos y panel)
  revalidatePath("/", "layout");
}
