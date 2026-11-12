/**
 * ENVIAR UN MENSAJE DEL EQUIPO (con texto, imagen y/o tarea) y avisar por correo si toca.
 * Un solo camino para la acción del chat (solo texto) y para /api/mensajes/enviar (con imagen):
 * las mismas comprobaciones y los mismos avisos en los dos casos.
 */
import "server-only";
import { after } from "next/server";
import { enLinea } from "@/config/equipo";
import {
  canalDeRuta,
  grupoDe,
  leerDatosTarea,
  limpiarMensaje,
  problemaMensaje,
  resumenMensaje,
} from "@/config/mensajes";
import { enviarCorreo } from "@/lib/correo";
import { plantillaMensajeEquipo } from "@/lib/correo/plantillas";
import { db } from "@/lib/db";
import { avisoDeMensaje } from "@/config/push";
import { registrarIntento } from "@/lib/limite";
import { avisarPorPush } from "@/lib/push/push";
import type { UsuarioActual } from "@/lib/sesion";
import { guardarImagenMensaje } from "./imagenes";
import { ErrorMensaje, escribirMensaje, totalNoLeidos } from "./mensajes";

/** Lo que manda el cuadro de «Tarea» del chat (las fechas, ya en ISO desde la hora del navegador) */
export interface TareaNueva {
  prioridad?: string;
  entrega?: string;
  responsableId?: string;
  recordatorio?: string;
  recordatorioOtro?: string;
}

export async function enviarYAvisar(
  yo: UsuarioActual,
  ruta: string,
  textoOriginal: string,
  tarea: TareaNueva | null,
  imagen: Buffer | null = null,
) {
  const canal = canalDeRuta(String(ruta), yo.id);
  if (!canal) throw new ErrorMensaje("Ese chat no existe.");
  const texto = limpiarMensaje(String(textoOriginal ?? ""));
  const problema = problemaMensaje(texto, !!imagen);
  if (problema) throw new ErrorMensaje(problema);
  const datosTarea = tarea && typeof tarea === "object" ? leerDatosTarea(tarea) : null;
  if (typeof datosTarea === "string") throw new ErrorMensaje(datosTarea);
  if (!(await registrarIntento("mensajeEquipo", yo.id)))
    throw new ErrorMensaje("Has enviado muchos mensajes seguidos. Espera un poco.");
  if (imagen && !(await registrarIntento("imagenEquipo", yo.id)))
    throw new ErrorMensaje("Has enviado muchas imágenes seguidas. Espera un rato.");

  const guardada = imagen ? await guardarImagenMensaje(imagen) : null;
  const { otro, yaTeniaSinLeer, responsable } = await escribirMensaje(
    yo,
    canal,
    texto,
    datosTarea,
    guardada,
  );

  // Aviso push al momento (como WhatsApp) a todos los que ven el chat menos a mí. Después de
  // responder, para que quien envía no espere
  const conImagen = !!guardada;
  after(() =>
    avisarAlEquipo(yo, otro?.id ?? null, canal, {
      texto,
      conImagen,
      esTarea: !!datosTarea,
      responsableId: responsable?.id ?? null,
    }),
  );

  // Correo: en un privado, con el primero sin leer; y a quien le encargan una tarea en un grupo.
  // Nunca si está conectado ahora mismo (ya lo ve en la web)
  const avisar =
    otro && !yaTeniaSinLeer
      ? otro.id
      : !otro && responsable && responsable.id !== yo.id
        ? responsable.id
        : null;
  if (!avisar) return;
  const destino = await db.usuario.findUnique({
    where: { id: avisar },
    select: { email: true, nombre: true, ultimaConexionEn: true },
  });
  if (!destino || enLinea(destino.ultimaConexionEn)) return;
  await enviarCorreo(
    plantillaMensajeEquipo({
      para: destino.email,
      nombre: destino.nombre,
      de: yo.nombre,
      texto: resumenMensaje(texto, !!guardada),
      esTarea: !!datosTarea,
      ruta: otro ? yo.id : canal,
    }),
  );
}

/** Manda el aviso push del mensaje nuevo: en un privado, a la otra persona; en un grupo, a todo el grupo */
async function avisarAlEquipo(
  yo: UsuarioActual,
  otroId: string | null,
  canal: string,
  datos: { texto: string; conImagen: boolean; esTarea: boolean; responsableId: string | null },
) {
  const destinos = await db.usuario.findMany({
    where: otroId
      ? { id: otroId }
      : { AND: [grupoDe(canal)?.filtro ?? { id: { in: [] } }, { id: { not: yo.id } }] },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      tambienEditor: true,
      tambienHardware: true,
      rolFemenino: true,
    },
  });
  const porId = new Map(destinos.map((d) => [d.id, d]));
  await avisarPorPush(
    destinos.map((d) => d.id),
    async (id) => {
      const persona = porId.get(id)!;
      return {
        ...avisoDeMensaje({
          de: yo.nombre,
          texto: datos.texto,
          conImagen: datos.conImagen,
          esTarea: datos.esTarea,
          tareaParaTi: datos.responsableId === id,
          ruta: otroId ? yo.id : canal,
        }),
        total: await totalNoLeidos(persona).catch(() => undefined),
      };
    },
  );
}
