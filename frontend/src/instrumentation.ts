/**
 * Se ejecuta una vez cada vez que arranca el servidor (por ejemplo, tras publicar en Render).
 * Avisa a Bing y compañía de que hay páginas nuevas (src/lib/indexnow.ts). No retrasa el arranque.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { avisarBuscadores } = await import("./lib/indexnow");
  avisarBuscadores();
}
