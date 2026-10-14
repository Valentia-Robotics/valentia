import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centra el contenido y le da márgenes laterales iguales en toda la web. */
export function Contenedor({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}
