/**
 * GOOGLE ANALYTICS 4 (opcional)
 * Apagado mientras no haya NEXT_PUBLIC_GA_ID (G-XXXXXXX) en las variables de Render. Con él:
 *   - el aviso de cookies añade la categoría «Analítica» y se vuelve a preguntar a todo el mundo;
 *   - Google Analytics solo se carga en el navegador de quien la acepta (RGPD y LSSI);
 *   - la CSP de next.config.ts deja pasar a Google solo entonces.
 * Las estadísticas propias (/admin/visitas, sin cookies) siguen funcionando igual.
 * Es una variable NEXT_PUBLIC: se lee al compilar, así que cambiarla exige volver a desplegar.
 */
const crudo = process.env.NEXT_PUBLIC_GA_ID ?? "";

/** El ID solo vale con su forma (G- y letras/números): nada raro llega a la página */
export const ID_ANALITICA = /^G-[A-Z0-9]{4,15}$/.test(crudo) ? crudo : "";

export const hayAnalitica = ID_ANALITICA !== "";
