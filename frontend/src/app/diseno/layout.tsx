import type { ReactNode } from "react";
import { MarcoWeb } from "@/components/layout/MarcoWeb";

/** Páginas de la web pública: con la barra de navegación y el pie de página */
export default function Layout({ children }: { children: ReactNode }) {
  return <MarcoWeb>{children}</MarcoWeb>;
}
