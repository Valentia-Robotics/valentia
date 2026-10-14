import type { NextConfig } from "next";

// Configuración de Next.js.
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Las acciones del panel reciben fotos (máximo 5 MB, ver src/lib/almacenamiento).
      // Dejamos un poco más de margen para el resto de los datos del formulario.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
