import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PantallaMensajes } from "@/components/mensajes/PantallaMensajes";
import { esDelEquipo } from "@/config/equipo";
import { listarConversaciones } from "@/lib/mensajes/mensajes";
import { exigirUsuario } from "@/lib/sesion";

export const metadata: Metadata = { title: "Chats" };

/** LA LISTA DE CHATS (en el móvil, solo la lista; en el ordenador, la lista y un hueco a la derecha) */
export default async function Mensajes() {
  const yo = await exigirUsuario("/mensajes");
  if (!esDelEquipo(yo.rol)) notFound();
  return <PantallaMensajes conversaciones={await listarConversaciones(yo)} />;
}
