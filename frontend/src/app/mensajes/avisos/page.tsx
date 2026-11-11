import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PanelAvisos } from "@/components/mensajes/PanelAvisos";
import { esDelEquipo } from "@/config/equipo";
import { aparatosConAvisos } from "@/lib/push/push";
import { exigirUsuario } from "@/lib/sesion";

export const metadata: Metadata = { title: "Avisos" };

/** AVISOS DE LOS MENSAJES: activarlos en este aparato, probarlos y la guía para cada móvil */
export default async function Avisos() {
  const yo = await exigirUsuario("/mensajes/avisos");
  if (!esDelEquipo(yo.rol)) notFound();
  const aparatos = await aparatosConAvisos(yo.id);
  return (
    <PanelAvisos
      email={yo.email}
      aparatos={aparatos.map((a) => ({ aparato: a.aparato, creadaEn: a.creadaEn.toISOString() }))}
    />
  );
}
