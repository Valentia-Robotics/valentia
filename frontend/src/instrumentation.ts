/**
 * Se ejecuta una vez cada vez que arranca el servidor (por ejemplo, tras publicar en Render).
 * - Avisa a Bing y compañía de que hay páginas nuevas (src/lib/indexnow.ts). No retrasa el arranque.
 * - Cada minuto, mira si hay recordatorios de tareas que ya tocan (correo + aviso en el móvil),
 *   aunque nadie tenga la web abierta (src/app/api/mensajes/recordatorios).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { avisarBuscadores } = await import("./lib/indexnow");
  avisarBuscadores();
  const { relojRecordatorios } = await import("./lib/relojRecordatorios");
  relojRecordatorios();
}
