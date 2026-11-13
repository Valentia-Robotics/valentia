/**
 * ENVIAR UN MENSAJE CON IMAGEN: POST /api/mensajes/enviar (formulario multipart)
 * Campos: chat (general o el id de la otra persona), texto (puede ir vacío), imagen (o gif: el id
 * de un GIF de GIPHY, que el servidor descarga y guarda como imagen; o audio + segundos: una nota
 * de voz grabada en el navegador) y, si es una tarea, tarea
 * (sus opciones en JSON). Los mensajes de solo texto van por la acción del chat.
 * Va por /api para no pasar por el proxy (que corta los cuerpos grandes).
 * Mismas reglas que el resto: solo el equipo, y solo en los chats que puede ver cada uno.
 */
import { revalidatePath } from "next/cache";
import { esDelEquipo } from "@/config/equipo";
import {
  MAX_BYTES_AUDIO,
  MAX_BYTES_IMAGEN,
  MAX_MB_IMAGEN,
  TIPOS_IMAGEN_MENSAJE,
  leerSegundosAudio,
  problemaAudio,
} from "@/config/mensajes";
import { ErrorAlmacenPrivado } from "@/lib/almacenamiento/privado";
import { leerBytes } from "@/lib/cuerpoLimitado";
import { enviarYAvisar, type TareaNueva } from "@/lib/mensajes/enviar";
import { descargarGif } from "@/lib/mensajes/gifs";
import { ErrorMensaje } from "@/lib/mensajes/mensajes";
import { mismoSitio } from "@/lib/mismoSitio";
import { obtenerUsuario } from "@/lib/sesion";

const respuesta = (cuerpo: object, status: number) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(peticion: Request) {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol)) return respuesta({ error: "No encontrado" }, 404);
  if (!mismoSitio(peticion)) return respuesta({ error: "No permitido" }, 403);

  // La imagen + el texto + los bordes del formulario: un poco más que la imagen sola
  const bytes = await leerBytes(peticion, Math.max(MAX_BYTES_IMAGEN, MAX_BYTES_AUDIO) + 64 * 1024);
  if (!bytes) return respuesta({ error: `La imagen pesa más de ${MAX_MB_IMAGEN} MB.` }, 413);

  let formulario: FormData;
  try {
    formulario = await new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": peticion.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    return respuesta({ error: "No se ha podido leer el envío." }, 400);
  }

  const imagen = formulario.get("imagen");
  const gif = formulario.get("gif");
  const audio = formulario.get("audio");
  const conGif = typeof gif === "string" && gif !== "";
  const conAudio = audio instanceof File && audio.size > 0;
  const segundos = leerSegundosAudio(formulario.get("segundos"));
  if (conAudio) {
    const problema = problemaAudio(audio, segundos);
    if (problema) return respuesta({ error: problema }, 400);
  } else if (!conGif) {
    if (!(imagen instanceof File) || imagen.size === 0) {
      return respuesta({ error: "Falta la imagen." }, 400);
    }
    if (!TIPOS_IMAGEN_MENSAJE.includes(imagen.type)) {
      return respuesta({ error: "Solo se pueden enviar imágenes JPG, PNG, WebP o GIF." }, 400);
    }
  }
  let tarea: TareaNueva | null = null;
  const tareaTexto = formulario.get("tarea");
  if (typeof tareaTexto === "string" && tareaTexto) {
    try {
      tarea = JSON.parse(tareaTexto) as TareaNueva;
    } catch {
      return respuesta({ error: "Las opciones de la tarea no son válidas." }, 400);
    }
  }

  try {
    const contenido = conAudio
      ? null
      : conGif
        ? await descargarGif(gif)
        : Buffer.from(await (imagen as File).arrayBuffer());
    await enviarYAvisar(
      yo,
      String(formulario.get("chat") ?? ""),
      String(formulario.get("texto") ?? ""),
      tarea,
      contenido,
      conAudio ? { datos: Buffer.from(await audio.arrayBuffer()), segundos: segundos! } : null,
    );
  } catch (error) {
    if (error instanceof ErrorMensaje || error instanceof ErrorAlmacenPrivado) {
      return respuesta({ error: error.message }, 400);
    }
    console.error("[mensajes] No se ha podido enviar una imagen o nota de voz.", error);
    return respuesta(
      {
        error: `No se ha podido enviar ${conAudio ? "la nota de voz" : "la imagen"}. Vuelve a probar.`,
      },
      500,
    );
  }
  revalidatePath("/mensajes", "layout");
  return respuesta({ ok: true }, 201);
}
