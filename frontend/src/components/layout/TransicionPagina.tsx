"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/**
 * Paso suave de una página a otra: la anterior se desvanece y la nueva llega subiendo un poco.
 * La clave por ruta hace que cada página cuente como una nueva (los layouts no cambian al navegar).
 * Las animaciones están en globals.css. En un navegador sin View Transitions, cambia sin animar.
 */
export function TransicionPagina({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  return (
    <ViewTransition key={ruta} enter="pagina-entra" exit="pagina-sale" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
