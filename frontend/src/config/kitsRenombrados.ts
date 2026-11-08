/**
 * KITS QUE HAN CAMBIADO DE DIRECCIÓN (slug): el viejo → el nuevo.
 * La dirección vieja sigue funcionando: next.config.ts la redirige a la nueva (ficha, fotos y tarjeta
 * para redes), los carritos guardados en el navegador se actualizan solos (src/store/carrito.ts) y el
 * pre-despliegue de Render cambia el slug en la base de datos (scripts/renombrar-kits.ts).
 * Para renombrar otro kit: añadir aquí la pareja y cambiar el slug en data/ y en el código.
 */
export const KITS_RENOMBRADOS: Readonly<Record<string, string>> = {
  // Jesse, 08-11-2026: «Kit de coche robótico multifunción VR1 - Starter Kit»
  "coche-seguidor-de-lineas": "vr1-starter-kit",
};

/** El slug de hoy de un kit (si se le pasa uno viejo, devuelve el nuevo) */
export function slugKitActual(slug: string): string {
  return Object.hasOwn(KITS_RENOMBRADOS, slug) ? KITS_RENOMBRADOS[slug] : slug;
}

/** Redirecciones permanentes de las direcciones viejas (las usa next.config.ts) */
export function redireccionesKitsRenombrados() {
  return Object.entries(KITS_RENOMBRADOS).flatMap(([viejo, nuevo]) => [
    { source: `/kits/${viejo}`, destination: `/kits/${nuevo}`, permanent: true },
    { source: `/kits/${viejo}/:resto*`, destination: `/kits/${nuevo}/:resto*`, permanent: true },
    {
      source: `/images/kits/${viejo}.svg`,
      destination: `/images/kits/${nuevo}.svg`,
      permanent: true,
    },
    {
      source: `/images/redes/kits/${viejo}.png`,
      destination: `/images/redes/kits/${nuevo}.png`,
      permanent: true,
    },
  ]);
}
