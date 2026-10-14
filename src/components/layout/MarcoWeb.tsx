import type { ReactNode } from "react";
import { BarraNavegacion } from "@/components/layout/BarraNavegacion";
import { PieDePagina } from "@/components/layout/PieDePagina";

/**
 * Marco de la web pública: barra de navegación arriba, contenido y pie de página.
 * Lo usan los layouts de la tienda, las cuentas, los cursos… (el panel /admin tiene el suyo).
 */
export function MarcoWeb({ children }: { children: ReactNode }) {
  return (
    <>
      <BarraNavegacion />
      {/* pt-nav deja hueco para la barra de navegación fija */}
      <main id="contenido" className="flex-1 pt-nav print:pt-0">
        {children}
      </main>
      <PieDePagina />
    </>
  );
}
