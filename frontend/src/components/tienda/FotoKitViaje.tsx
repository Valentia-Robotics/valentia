import { ViewTransition, type ReactNode } from "react";

/**
 * La foto de un kit «viaja» de la tarjeta a su ficha: se ve que es la misma pieza, no otra página.
 * Rodea la foto en todos los sitios donde sale un kit; el nombre une las dos fotos.
 */
export function FotoKitViaje({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <ViewTransition name={`kit-${slug}`} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
