import type { ReactNode } from "react";
import { BarraNavegacion } from "@/components/layout/BarraNavegacion";
import { PieDePagina } from "@/components/layout/PieDePagina";
import { TransicionPagina } from "@/components/layout/TransicionPagina";

/**
 * Marco de la web pública: barra de navegación arriba, contenido y pie de página.
 * Lo usan los layouts de la tienda, las cuentas, los cursos… (el panel /admin tiene el suyo).
 */
export function MarcoWeb({ children }: { children: ReactNode }) {
  return (
    // "tienda": activa el estilo de la web pública (globals.css) sin tocar los paneles internos
    <div className="tienda flex min-h-full flex-1 flex-col">
      <BarraNavegacion />
      {/* pt-nav deja hueco para la barra de navegación fija */}
      <main id="contenido" className="flex-1 pt-nav print:pt-0">
        <TransicionPagina>{children}</TransicionPagina>
      </main>
      <PieDePagina />
    </div>
  );
}
