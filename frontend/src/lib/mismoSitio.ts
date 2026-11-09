/**
 * ¿La petición sale de una página de esta misma web? Para rutas que cambian datos con la cookie de
 * sesión: otra web no puede hacer que el navegador de alguien las llame en su nombre.
 */
export function mismoSitio(peticion: Request): boolean {
  const sitio = peticion.headers.get("sec-fetch-site");
  if (sitio) return sitio === "same-origin";
  const origen = peticion.headers.get("origin");
  const host = peticion.headers.get("x-forwarded-host") ?? peticion.headers.get("host");
  if (!origen || !host) return false;
  try {
    return new URL(origen).host === host;
  } catch {
    return false;
  }
}
