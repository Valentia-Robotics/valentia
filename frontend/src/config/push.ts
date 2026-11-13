/**
 * AVISOS PUSH DEL EQUIPO (reglas puras, sin BD): los avisos que salen en el móvil o el ordenador
 * cuando llega un mensaje, como los de WhatsApp, aunque la web esté cerrada.
 * El envío está en src/lib/push/push.ts y lo que hace el navegador al recibirlos, en public/sw.js.
 */
import { grupoDe } from "./mensajes";

/** Lo que le llega al navegador en cada aviso (lo lee public/sw.js) */
export interface AvisoPush {
  titulo: string;
  cuerpo: string;
  /** A dónde lleva al tocarlo, p. ej. /mensajes/general */
  url: string;
  /** Avisos con la misma etiqueta se juntan (uno por chat, como WhatsApp) */
  etiqueta: string;
  /** El chat del aviso ("general" o el id de la otra persona): si ya lo tienes abierto, no molesta */
  ruta: string;
  /** Mensajes sin leer en total: el número del icono de la app */
  total?: number;
}

/** Un aviso no puede ser muy largo (los servicios de push cortan en ~4 KB) */
const MAX_CUERPO = 180;

export function recortar(texto: string, max = MAX_CUERPO): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
}

/** El aviso de un mensaje nuevo, dicho como en WhatsApp: «Dani» / «Dani · General» */
export function avisoDeMensaje(datos: {
  de: string;
  texto: string;
  conImagen: boolean;
  esTarea: boolean;
  /** La tarea es para quien recibe el aviso */
  tareaParaTi: boolean;
  /** El grupo ("general", "hardware"…) o el id de quien escribe (la ruta del chat para quien lo recibe) */
  ruta: string;
}): AvisoPush {
  const grupo = grupoDe(datos.ruta);
  const titulo = grupo ? `${datos.de} · ${grupo.nombre}` : datos.de;
  const antes = datos.tareaParaTi ? "📋 Tarea para ti: " : datos.esTarea ? "📋 Tarea: " : "";
  const texto = datos.texto.trim() || (datos.conImagen ? "📷 Imagen" : "");
  const cuerpo = recortar(`${antes}${datos.conImagen && datos.texto.trim() ? "📷 " : ""}${texto}`);
  return {
    titulo,
    cuerpo,
    url: `/mensajes/${datos.ruta}`,
    etiqueta: `chat-${datos.ruta}`,
    ruta: datos.ruta,
  };
}

/** El aviso de un recordatorio de tarea (la «alarma») */
export function avisoDeRecordatorio(datos: {
  id: string;
  texto: string;
  entrega: string | null;
  ruta: string;
}): AvisoPush {
  return {
    titulo: "⏰ Recordatorio de tarea",
    cuerpo: recortar(`${datos.texto}${datos.entrega ? ` · Entrega: ${datos.entrega}` : ""}`),
    url: `/mensajes/${datos.ruta}`,
    etiqueta: `tarea-${datos.id}`,
    ruta: datos.ruta,
  };
}

/** «iPhone · Safari», «Android · Chrome», «Windows · Edge»… para la lista de aparatos */
export function nombreAparato(agente: string): string {
  const a = agente || "";
  const sistema = /iPhone/.test(a)
    ? "iPhone"
    : /iPad/.test(a)
      ? "iPad"
      : /Android/.test(a)
        ? "Android"
        : /Windows/.test(a)
          ? "Windows"
          : /Mac OS X|Macintosh/.test(a)
            ? "Mac"
            : /Linux/.test(a)
              ? "Linux"
              : "Otro";
  const navegador = /Edg\//.test(a)
    ? "Edge"
    : /OPR\/|Opera/.test(a)
      ? "Opera"
      : /SamsungBrowser/.test(a)
        ? "Samsung Internet"
        : /Firefox|FxiOS/.test(a)
          ? "Firefox"
          : /Chrome|CriOS|Chromium/.test(a)
            ? "Chrome"
            : /Safari/.test(a)
              ? "Safari"
              : "navegador";
  return `${sistema} · ${navegador}`;
}

/** Lo mínimo que tiene que traer una suscripción del navegador; null si no vale */
export function leerSuscripcion(
  entrada: unknown,
): { endpoint: string; p256dh: string; auth: string } | null {
  if (!entrada || typeof entrada !== "object") return null;
  const { endpoint, keys } = entrada as { endpoint?: unknown; keys?: Record<string, unknown> };
  if (typeof endpoint !== "string" || endpoint.length > 1000) return null;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  // Solo servicios de push de verdad, por https (nunca una dirección interna)
  if (
    url.protocol !== "https:" ||
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)
  )
    return null;
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  const base64url = /^[A-Za-z0-9_-]+=*$/;
  if (typeof p256dh !== "string" || !base64url.test(p256dh) || p256dh.length > 200) return null;
  if (typeof auth !== "string" || !base64url.test(auth) || auth.length > 100) return null;
  return { endpoint, p256dh, auth };
}

/** El aviso de una videollamada que empieza: «📹 Jesse te llama» / «📹 Jesse · General» */
export function avisoDeLlamada(datos: { id: string; de: string; ruta: string }): AvisoPush {
  const grupo = grupoDe(datos.ruta);
  return {
    titulo: grupo ? `📹 ${datos.de} · ${grupo.nombre}` : `📹 ${datos.de} te llama`,
    cuerpo: grupo
      ? `Ha empezado una videollamada en ${grupo.nombre}. Toca para unirte.`
      : "Videollamada. Toca para contestar.",
    // ?llamada=1: al tocarlo se entra directamente en la llamada
    url: `/mensajes/${datos.ruta}?llamada=1`,
    etiqueta: `llamada-${datos.id}`,
    ruta: datos.ruta,
  };
}
