import type { Metadata } from "next";
import { AvisoNoEncontrada } from "@/components/layout/AvisoNoEncontrada";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/** notFound() dentro de esta zona: su layout ya pone la barra y el pie (no repetirlos) */
export default function NoEncontrada() {
  return <AvisoNoEncontrada />;
}
