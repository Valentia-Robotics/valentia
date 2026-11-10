import type { Metadata } from "next";
import { PanelFinanzas } from "@/components/admin/PanelFinanzas";
import { leerPeriodo } from "@/config/finanzas";
import { obtenerFinanzas } from "@/lib/admin/finanzas";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Finanzas" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** FINANZAS: ingresos, gastos y beneficio de la empresa (solo ADMIN) */
export default async function FinanzasAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/finanzas");
  const parametros = await searchParams;
  const datos = await obtenerFinanzas(leerPeriodo(parametros.periodo));
  const aviso =
    parametros.guardado === "ingreso"
      ? "Ingreso guardado."
      : parametros.guardado === "gasto"
        ? "Gasto guardado."
        : parametros.borrado
          ? "Apunte borrado."
          : undefined;
  return <PanelFinanzas d={datos} aviso={aviso} />;
}
