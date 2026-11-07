import type { NextConfig } from "next";

const desarrollo = process.env.NODE_ENV === "development";

/** Dirección pública de las fotos en la nube (si se usa), para permitirlas en la CSP */
function origenFotos(): string {
  try {
    const url = process.env.ALMACEN_URL_PUBLICA;
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
}

/**
 * CONTENT-SECURITY-POLICY: de qué sitios puede cargar cosas la web. Todo lo demás se bloquea.
 *   - Stripe (formulario de pago): js.stripe.com, api.stripe.com y sus marcos.
 *   - Vídeos: YouTube (youtube-nocookie.com) y Vimeo, y sus API para saber cuándo termina el vídeo.
 * 'unsafe-inline' en scripts es necesario para que Next.js pueda generar las páginas estáticas
 * (la alternativa, un "nonce", obligaría a generar todas las páginas en cada visita). Ver SEGURIDAD.md.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${desarrollo ? " 'unsafe-eval'" : ""} https://js.stripe.com https://*.js.stripe.com https://www.youtube.com https://player.vimeo.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.stripe.com https://i.ytimg.com https://i.vimeocdn.com ${origenFotos()}`.trim(),
  "font-src 'self'",
  `connect-src 'self' https://api.stripe.com https://*.stripe.com https://*.stripe.network https://*.vimeocdn.com${desarrollo ? " ws: wss:" : ""}`,
  "frame-src https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://*.stripe.network https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
  "media-src 'self' https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Solo si la web se sirve por https (si no, "npm start" en local no cargaría nada)
  ...((process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://")
    ? ["upgrade-insecure-requests"]
    : []),
].join("; ");

const cabecerasSeguridad = [
  { key: "Content-Security-Policy", value: csp },
  // Solo por https durante 2 años (el navegador lo ignora en http://localhost)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Nadie puede meter la web dentro de un marco (evita el "clickjacking")
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      'camera=(), microphone=(), geolocation=(), usb=(), serial=(), bluetooth=(), payment=(self "https://js.stripe.com")',
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

// Configuración de Next.js.
const nextConfig: NextConfig = {
  // No anunciar "X-Powered-By: Next.js"
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Las acciones del panel reciben fotos (máximo 5 MB, ver src/lib/almacenamiento).
      // Dejamos un poco más de margen para el resto de los datos del formulario.
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      { source: "/:ruta*", headers: cabecerasSeguridad },
      // Fotos y dibujos: antes el navegador los volvía a pedir en cada visita. Un día de caché y otra
      // semana sirviendo la copia mientras se actualiza (al regenerarlas conservan el nombre)
      {
        source: "/images/:ruta*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
