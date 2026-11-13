/**
 * RESPONDER A UN MENSAJE CONCRETO, como en WhatsApp (Jesse, 13-11-2026). Reglas puras (sin BD).
 *
 * El mensaje nuevo guarda una COPIA corta del que cita (quién lo escribió y un extracto): así la
 * cita se ve aunque el original sea muy antiguo. Si el original se borra, la cita pasa a decir
 * «Mensaje borrado». Al tocar la cita, el chat salta al original (si sigue cargado en pantalla).
 */
import { resumenMensaje } from "./mensajes";

/** Lo más largo que se guarda del mensaje citado */
export const MAX_CARACTERES_CITA = 140;

/** Lo que dice la cita cuando el original ya no existe */
export const CITA_BORRADA = "Mensaje borrado";

/** La cita que va dentro de un mensaje (lo que ve la pantalla) */
export interface Cita {
  id: string;
  autorId: string | null;
  autorNombre: string;
  texto: string;
}

/** El extracto que se guarda del mensaje citado: su texto, «📷 Foto», «🎤 Nota de voz (0:12)»… */
export function textoCita(original: {
  texto: string;
  conImagen: boolean;
  segundosAudio: number | null;
  esSticker?: boolean;
  esTarea?: boolean;
}): string {
  const base = resumenMensaje(
    original.texto.replace(/\s+/g, " ").trim(),
    original.conImagen,
    original.segundosAudio,
    !!original.esSticker,
  );
  const texto = (original.esTarea ? `📋 ${base}` : base).trim() || "Mensaje";
  return texto.length > MAX_CARACTERES_CITA
    ? `${texto.slice(0, MAX_CARACTERES_CITA - 1).trimEnd()}…`
    : texto;
}

/** Quién aparece en la cita: «Tú» si el citado es mío */
export const autorCita = (cita: Pick<Cita, "autorId" | "autorNombre">, miId: string) =>
  cita.autorId && cita.autorId === miId ? "Tú" : cita.autorNombre;

/* ---------- Deslizar para responder (pantallas táctiles) ---------- */

/** Cuánto hay que deslizar a la derecha (px) para responder */
export const DESLIZAR_PARA_RESPONDER = 56;
/** Lo más que se mueve la burbuja con el dedo */
export const DESLIZAR_MAXIMO = 80;

/**
 * Cuánto se mueve la burbuja con el dedo. null = no es un deslizamiento para responder (va hacia
 * la izquierda o es más vertical que horizontal: es el scroll del chat).
 */
export function desplazamientoDeslizar(dx: number, dy: number): number | null {
  if (dx <= 0 || Math.abs(dy) > Math.abs(dx)) return null;
  // Al principio sigue al dedo; cerca del máximo, cuesta más (como una goma)
  return dx <= DESLIZAR_PARA_RESPONDER
    ? dx
    : Math.min(DESLIZAR_MAXIMO, DESLIZAR_PARA_RESPONDER + (dx - DESLIZAR_PARA_RESPONDER) * 0.4);
}

/** ¿Se ha deslizado lo bastante para responder? */
export const deslizadoBastante = (dx: number, dy: number) =>
  (desplazamientoDeslizar(dx, dy) ?? 0) >= DESLIZAR_PARA_RESPONDER;
