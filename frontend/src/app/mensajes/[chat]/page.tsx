import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Chat } from "@/components/mensajes/Chat";
import { PantallaMensajes } from "@/components/mensajes/PantallaMensajes";
import { esDelEquipo } from "@/config/equipo";
import { abrirChat, companeros, huellaChat, listarConversaciones } from "@/lib/mensajes/mensajes";
import { exigirUsuario } from "@/lib/sesion";

export const metadata: Metadata = { title: "Chat" };

/** UN CHAT: /mensajes/general o /mensajes/<id de la otra persona> */
interface Props {
  params: Promise<{ chat: string }>;
}

export default async function PaginaChat({ params }: Props) {
  const { chat } = await params;
  const yo = await exigirUsuario(`/mensajes/${chat}`);
  if (!esDelEquipo(yo.rol)) notFound();
  // Primero se abre (y se marca como leído), así la lista ya sale sin su número
  const abierto = await abrirChat(yo, chat);
  if (!abierto) notFound();
  const [conversaciones, huella] = await Promise.all([
    listarConversaciones(yo),
    huellaChat(yo, chat),
  ]);
  const esta = conversaciones.find((c) => c.ruta === chat);
  // Para elegir a quién va una tarea: en el General, todo el equipo; en un privado, los dos
  const yoMismo = { id: yo.id, nombre: `${yo.nombre} (tú)` };
  const personas = abierto.otro
    ? [{ id: abierto.otro.id, nombre: abierto.otro.nombre }, yoMismo]
    : [yoMismo, ...(await companeros(yo)).map((c) => ({ id: c.id, nombre: c.nombre }))];

  return (
    <PantallaMensajes conversaciones={conversaciones} activa={chat}>
      <Chat
        // key: al cambiar de chat, el cuadro de texto empieza vacío
        key={chat}
        ruta={chat}
        titulo={esta?.nombre ?? abierto.otro?.nombre ?? "General"}
        foto={esta?.foto ?? abierto.otro?.foto ?? null}
        rol={abierto.otro?.rol ?? null}
        ultimaConexionEn={abierto.otro?.ultimaConexionEn ?? null}
        miId={yo.id}
        soyAdmin={yo.rol === "ADMIN"}
        puedeEscribir={abierto.puedeEscribir}
        mensajes={abierto.mensajes}
        huella={huella}
        personas={personas}
        lecturas={abierto.lecturas}
      />
    </PantallaMensajes>
  );
}
