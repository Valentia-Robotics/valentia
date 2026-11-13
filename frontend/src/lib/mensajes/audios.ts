/**
 * NOTAS DE VOZ DE LOS MENSAJES DEL EQUIPO
 * Se comprueba por su contenido que de verdad es un audio (MP4, WebM u Ogg) y se guarda TAL CUAL
 * en el almacén PRIVADO (src/lib/almacenamiento/privado.ts): en Render no hay programas para
 * convertir audio, y los tres formatos ya vienen comprimidos. Nunca tiene dirección pública:
 * se oye por /api/mensajes/audio/<id del mensaje>, que comprueba antes quién lo pide.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import {
  MAX_BYTES_AUDIO,
  MAX_MB_AUDIO,
  extensionAudio,
  tipoAudioDeContenido,
  type TipoAudio,
} from "@/config/mensajes";
import { guardarPrivado } from "@/lib/almacenamiento/privado";
import { ErrorMensaje } from "./mensajes";

export interface AudioGuardado {
  clave: string;
  tipo: TipoAudio;
  segundos: number;
}

/** Guarda la nota de voz. Lanza ErrorMensaje (con un texto para la pantalla) si no vale */
export async function guardarAudioMensaje(
  contenido: Buffer,
  segundos: number,
): Promise<AudioGuardado> {
  if (contenido.length > MAX_BYTES_AUDIO)
    throw new ErrorMensaje(`La nota de voz pesa demasiado (máximo ${MAX_MB_AUDIO} MB).`);
  const tipo = tipoAudioDeContenido(contenido);
  if (!tipo) throw new ErrorMensaje("No hemos podido leer la nota de voz. Vuelve a grabarla.");
  const clave = `mensajes/audio-${Date.now().toString(36)}-${randomBytes(12).toString("hex")}.${extensionAudio(tipo)}`;
  await guardarPrivado(clave, contenido, tipo);
  return { clave, tipo, segundos };
}
