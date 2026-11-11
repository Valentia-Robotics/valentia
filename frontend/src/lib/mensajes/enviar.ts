/**
 * ENVIAR UN MENSAJE DEL EQUIPO (con texto, imagen y/o tarea) y avisar por correo si toca.
 * Un solo camino para la acción del chat (solo texto) y para /api/mensajes/enviar (con imagen):
 * las mismas comprobaciones y los mismos avisos en los dos casos.
 */
import "server-only";
import { enLinea } from "@/config/equipo";
import {
  canalDeRuta,
  leerDatosTarea,
  limpiarMensaje,
  problemaMensaje,
  resumenMensaje,
} from "@/config/mensajes";
import { enviarCorreo } from "@/lib/correo";
import { plantillaMensajeEquipo } from "@/lib/correo/plantillas";
import { db } from "@/lib/db";
import { registrarIntento } from "@/lib/limite";
import type { UsuarioActual } from "@/lib/sesion";
import { guardarImagenMensaje } from "./imagenes";
import { ErrorMensaje, escribirMensaje } from "./mensajes";

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

  // Correo: en un privado, con el primero sin leer; y a quien le encargan una tarea en el General.
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
      ruta: otro ? yo.id : "general",
    }),
  );
}
