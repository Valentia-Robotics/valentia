import type { Metadata } from "next";
import { AvisoNoEncontrada } from "@/components/layout/AvisoNoEncontrada";
import { MarcoWeb } from "@/components/layout/MarcoWeb";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/** Se muestra cuando una dirección no existe (o todavía no está construida). */
export default function NoEncontrada() {
  return (
    <MarcoWeb>
      <AvisoNoEncontrada />
    </MarcoWeb>
  );
}
