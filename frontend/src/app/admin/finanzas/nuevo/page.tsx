import type { Metadata } from "next";
import { Cabecera } from "@/components/admin/Cabecera";
import { FormularioMovimiento } from "@/components/admin/FormularioMovimiento";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Apuntar ingreso o gasto" };

interface Props {
  searchParams: Promise<{ tipo?: string }>;
}

/** APUNTAR UN INGRESO O UN GASTO (?tipo=ingreso abre el formulario en «Ingreso») */
export default async function NuevoMovimiento({ searchParams }: Props) {
  await exigirAdmin("/admin/finanzas/nuevo");
  const tipo = (await searchParams).tipo === "ingreso" ? "INGRESO" : "GASTO";
  return (
    <>
      <Cabecera
        titulo={tipo === "INGRESO" ? "Apuntar un ingreso" : "Apuntar un gasto"}
        descripcion="Las ventas de la web no hace falta apuntarlas: se suman solas al cobrarse."
        volver={{ href: "/admin/finanzas", etiqueta: "Finanzas" }}
      />
      <FormularioMovimiento tipoInicial={tipo} />
    </>
  );
}
