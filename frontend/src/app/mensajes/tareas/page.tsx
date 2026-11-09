import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TableroTareas } from "@/components/mensajes/TableroTareas";
import { esDelEquipo } from "@/config/equipo";
import { listarTareas } from "@/lib/mensajes/mensajes";
import { exigirUsuario } from "@/lib/sesion";

export const metadata: Metadata = { title: "Tareas" };

/** TODAS LAS TAREAS que puedes ver (del General y de tus chats), en un tablero como el de Notion */
export default async function Tareas() {
  const yo = await exigirUsuario("/mensajes/tareas");
  if (!esDelEquipo(yo.rol)) notFound();
  return <TableroTareas tareas={await listarTareas(yo)} miId={yo.id} />;
}
