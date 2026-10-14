import type { Metadata, Viewport } from "next";
import { Inter, Jost } from "next/font/google";
import type { ReactNode } from "react";
import { BarraNavegacion } from "@/components/layout/BarraNavegacion";
import { PieDePagina } from "@/components/layout/PieDePagina";
import { marca } from "@/config/marca";
import "./globals.css";

/*
 * Tipografías (gratuitas, de Google Fonts). Next.js las descarga al compilar
 * y las sirve desde nuestra propia web, así que no dependen de Google al navegar.
 *   - Jost: titulares. Geométrica y fina, como el logo.
 *   - Inter: textos. Muy legible en pantalla.
 */
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Metadatos: lo que ven Google y las redes sociales, y el título de la pestaña.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${marca.nombre} — ${marca.lema}`,
    // En cada página: "Kits · Valentia"
    template: `%s · ${marca.nombre}`,
  },
  description: marca.descripcion,
  applicationName: marca.nombre,
  openGraph: {
    siteName: marca.nombre,
    locale: "es_ES",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${jost.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        {/* Enlace oculto para quien navega con teclado: salta directamente al contenido */}
        <a
          href="#contenido"
          className="sr-only z-[60] rounded-boton bg-tinta px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Saltar al contenido
        </a>

        <BarraNavegacion />

        {/* pt-nav deja hueco para la barra de navegación fija */}
        <main id="contenido" className="flex-1 pt-nav">
          {children}
        </main>

        <PieDePagina />
      </body>
    </html>
  );
}
