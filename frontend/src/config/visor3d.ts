/**
 * VISOR 3D DE LAS PIEZAS (reglas puras: las usan la ficha de la pieza, la CSP y su test)
 *
 * El botón «Ver en 3D» de la ficha de una pieza abre, en una ventana, el visor de Visualizalo con esa
 * pieza sola: se gira, se acerca y se ve de cerca. Es un marco (<iframe>) a su web, así que:
 *   - Cada pieza con 3D tiene su demo allí, con nombre `vr-<slug de la pieza>`. Las que no están en
 *     PIEZAS_CON_3D no enseñan el botón (sus modelos se van añadiendo poco a poco).
 *   - Dentro de un marco el visor ya sale limpio: sin aviso de cookies ni ofertas de Visualizalo.
 *   - La CSP de next.config.ts tiene que dejar entrar ese origen en `frame-src`, o la ventana se queda
 *     en blanco sin dar ningún error visible.
 * NEXT_PUBLIC_VISOR_3D_URL cambia el origen (en local, el visor de Visualizalo arrancado en el
 * ordenador: http://localhost:4300).
 */

/** De dónde sale el visor si no se dice otra cosa */
export const ORIGEN_VISOR_3D_POR_DEFECTO = "https://www.visualizalo.es";

/** Las piezas que ya tienen su modelo 3D publicado (slug de la pieza, como en el catálogo) */
export const PIEZAS_CON_3D: ReadonlySet<string> = new Set([
  "arduino-uno-r3",
  "esp32-devkit",
  "motor-dc-reductora",
  "servo-sg90",
  "driver-motores-l298n",
  "sensor-ultrasonidos-hc-sr04",
  "sensor-linea-tcrt5000",
  "sensor-dht22",
  "sensor-presion-bmp280",
  "chasis-coche-2wd",
  "estructura-brazo-4dof",
  "protoboard-cables",
  "pantalla-oled-096",
  "zumbador-activo",
  "portapilas-4xaa",
  "bateria-18650-2s",
  "sensor-luz-ldr",
]);

/** El origen del visor: NEXT_PUBLIC_VISOR_3D_URL si es una dirección http(s) válida, si no el de por defecto */
export function origenVisor3d(valor: string | undefined = process.env.NEXT_PUBLIC_VISOR_3D_URL): string {
  try {
    const url = new URL(valor ?? "");
    if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
  } catch {
    // vacía o mal escrita: la de por defecto
  }
  return ORIGEN_VISOR_3D_POR_DEFECTO;
}

/** ¿Tiene esta pieza su modelo 3D? */
export function tiene3d(slug: string): boolean {
  return PIEZAS_CON_3D.has(slug);
}

/**
 * La dirección del visor de una pieza, o null si no tiene 3D. `ficha=1` es el modo «ficha de producto»
 * del visor: sin título y con el estudio plano, porque el nombre ya lo pone nuestra ventana.
 */
export function urlVisor3d(slug: string, origen: string = origenVisor3d()): string | null {
  if (!tiene3d(slug)) return null;
  return `${origen}/demo/vr-${encodeURIComponent(slug)}?ficha=1`;
}
