/**
 * LA «APP» DEL EQUIPO: /equipo.webmanifest. Es el manifest de las páginas de /mensajes: al
 * «Añadir a la pantalla de inicio» desde ahí, el icono abre directamente los mensajes (y en el
 * iPhone es lo que permite recibir avisos). La tienda sigue con el suyo (src/app/manifest.ts).
 */
import { marca } from "@/config/marca";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      id: "/mensajes",
      name: `${marca.nombre} · Equipo`,
      short_name: `${marca.nombre} Equipo`,
      description: "Mensajes y tareas del equipo de Valentia, con avisos al momento.",
      lang: "es",
      start_url: "/mensajes",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0b0b0b",
      icons: [
        { src: "/images/brand/icono-192.png", sizes: "192x192", type: "image/png" },
        { src: "/images/brand/icono-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
