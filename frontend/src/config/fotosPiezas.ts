/**
 * FOTOS REALISTAS DE LAS PIEZAS (los renders de Alonso, `public/images/componentes/<slug>.webp`).
 * Jesse (12-11-2026): «los modelos realistas de Alonso, en todos los lugares donde salga un sensor o
 * un actuador». Si la pieza tiene su render, se usa ese SIEMPRE (la BD puede guardar una foto vieja o
 * un dibujo); si no, la foto que tenga en la BD.
 */
const CON_RENDER: ReadonlySet<string> = new Set([
  "arduino-uno-r3",
  "bateria-18650-2s",
  "chasis-coche-2wd",
  "driver-motores-l298n",
  "esp32-devkit",
  "estructura-brazo-4dof",
  "motor-dc-reductora",
  "pantalla-oled-096",
  "portapilas-4xaa",
  "protoboard-cables",
  "sensor-dht22",
  "sensor-linea-tcrt5000",
  "sensor-luz-ldr",
  "sensor-presion-bmp280",
  "sensor-ultrasonidos-hc-sr04",
  "servo-mg996r",
  "servo-sg90",
  "zumbador-activo",
]);

export function fotoPieza(slug: string, deLaBd: string): string {
  return CON_RENDER.has(slug) ? `/images/componentes/${slug}.webp` : deLaBd;
}
