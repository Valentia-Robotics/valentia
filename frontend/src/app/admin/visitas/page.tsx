import type { Metadata } from "next";
import { PanelVisitas } from "@/components/admin/PanelVisitas";
import { leerPeriodo, obtenerVisitas } from "@/lib/admin/visitas";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Visitas" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** VISITAS: cuánta gente entra en la web, qué mira y de dónde viene */
export default async function VisitasAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/visitas");
  const periodo = leerPeriodo((await searchParams).dias);
  return <PanelVisitas v={await obtenerVisitas(periodo)} />;
}
