import type { ReactNode } from "react";
import { MarcoWeb } from "@/components/layout/MarcoWeb";
import { compraAbierta } from "@/lib/pagos";

/** Páginas de la web pública: con la barra de navegación y el pie de página */
export default function Layout({ children }: { children: ReactNode }) {
  return <MarcoWeb tiendaAbierta={compraAbierta()}>{children}</MarcoWeb>;
}
