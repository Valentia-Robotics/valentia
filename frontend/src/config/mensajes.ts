/**
 * MENSAJES DEL EQUIPO (/mensajes): reglas puras, sin base de datos.
 * Funciona como un WhatsApp del equipo: un chat «General» para todos los trabajadores
 * (administración, editores y hardware) y un chat privado entre cada dos personas.
 * Los clientes no lo ven nunca.
 *
 * Cada chat es un «canal» guardado como texto:
 *   - "general"                       → el grupo de todo el equipo
 *   - "hardware" / "edicion"          → el grupo de cada departamento (Jesse, 12-11-2026)
 *   - "privado:<id menor>_<id mayor>" → el chat de dos personas (siempre el mismo, lo abra quien lo abra)
 */
import {
  FILTRO_EDITORES,
  FILTRO_HARDWARE,
  ROLES_EQUIPO,
  esDelEquipo,
  puedeEditarGuiones,
  tieneEspacioHardware,
} from "./equipo";
import type { Rol } from "@/generated/prisma/enums";

export const CANAL_GENERAL = "general";

/** Lo que hace falta saber de una persona para saber en qué grupos está */
export interface PersonaGrupo {
  rol: Rol;
  tambienEditor?: boolean | null;
  tambienHardware?: boolean | null;
}

/** «Todo el equipo: administración, sigma, editores y hardware» (sale solo con cada rol nuevo) */
const TODO_EL_EQUIPO = (() => {
  const nombres = ROLES_EQUIPO.map((r) => r.plural.toLowerCase());
  const ultimo = nombres.pop();
  return `Todo el equipo: ${nombres.length ? `${nombres.join(", ")} y ${ultimo}` : ultimo}`;
})();

/**
 * LOS GRUPOS (chats de varias personas, como el General). Quién está en cada uno sale SOLO de su
 * rol: no hay que apuntar a nadie a mano. Un ADMIN o SIGMA entra en Hardware o en Edición solo si
 * también trabaja allí («también hardware» / «también editor» en /admin/usuarios), igual que su
 * espacio de archivos o «Mis guiones». Grupo nuevo → añadirlo aquí (el canal es también su dirección).
 */
export const GRUPOS = [
  {
    canal: CANAL_GENERAL,
    nombre: "General",
    descripcion: TODO_EL_EQUIPO,
    enLista: "El chat de todo el equipo",
    para: "todo el equipo",
    esMiembro: (p: PersonaGrupo) => esDelEquipo(p.rol),
    filtro: { rol: { in: ROLES_EQUIPO.map((r) => r.rol) } } as object,
  },
  {
    canal: "hardware",
    nombre: "Hardware",
    descripcion: "Solo el equipo de hardware",
    enLista: "El chat del equipo de hardware",
    para: "el equipo de hardware",
    esMiembro: tieneEspacioHardware,
    filtro: FILTRO_HARDWARE as object,
  },
  {
    canal: "edicion",
    nombre: "Edición",
    descripcion: "Solo el equipo de edición",
    enLista: "El chat del equipo de edición",
    para: "el equipo de edición",
    esMiembro: puedeEditarGuiones,
    filtro: FILTRO_EDITORES as object,
  },
] as const;

export type Grupo = (typeof GRUPOS)[number];

/** El grupo de un canal (o de una dirección: es lo mismo), o null si es un chat privado */
export const grupoDe = (canal: string): Grupo | null =>
  GRUPOS.find((g) => g.canal === canal) ?? null;

export const esGrupo = (canal: string) => grupoDe(canal) !== null;

/** Los grupos en los que está una persona (el General, siempre que sea del equipo) */
export const gruposDe = (persona: PersonaGrupo) => GRUPOS.filter((g) => g.esMiembro(persona));

/** Largo máximo de un mensaje (como una nota larga, no un documento: para eso, los archivos) */
export const MAX_CARACTERES_MENSAJE = 4000;

/** Mensajes que se cargan de cada chat (los más recientes) */
export const MENSAJES_POR_CHAT = 200;

/**
 * Cada cuánto mira el chat abierto si hay algo nuevo. Es una pregunta pequeña (una «huella» del
 * chat): solo cuando cambia se vuelve a pedir la página entera. Así llega casi al momento sin
 * cargar el servidor. El contador del menú va más despacio.
 */
export const SEGUNDOS_REFRESCO_CHAT = 3;
export const SEGUNDOS_REFRESCO_CONTADOR = 5;

/** El canal privado entre dos personas: el mismo sin importar quién lo abra */
export function canalPrivado(a: string, b: string): string {
  const [menor, mayor] = [a, b].sort();
  return `privado:${menor}_${mayor}`;
}

/** Los dos ids de un canal privado, o null si no lo es */
export function personasDelCanal(canal: string): [string, string] | null {
  const partes = /^privado:([0-9a-f]{24})_([0-9a-f]{24})$/.exec(canal);
  return partes ? [partes[1], partes[2]] : null;
}

/**
 * La dirección de cada chat: /mensajes/<grupo> (general, hardware, edicion) o /mensajes/<id de la otra persona>.
 * Devuelve el canal que corresponde a quien lo abre, o null si la dirección no vale.
 */
export function canalDeRuta(ruta: string, miId: string): string | null {
  if (esGrupo(ruta)) return ruta;
  if (!/^[0-9a-f]{24}$/.test(ruta) || ruta === miId) return null;
  return canalPrivado(miId, ruta);
}

/** Limpia el texto de un mensaje: sin espacios de sobra ni más de dos líneas vacías seguidas */
export function limpiarMensaje(texto: string): string {
  return texto
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Por qué no se puede enviar un mensaje, o null si está bien. Con imagen o audio, el texto puede ir vacío */
export function problemaMensaje(texto: string, conAdjunto = false): string | null {
  if (!texto && !conAdjunto) return "Escribe algo antes de enviar.";
  if (texto.length > MAX_CARACTERES_MENSAJE)
    return `El mensaje es muy largo (máximo ${MAX_CARACTERES_MENSAJE} caracteres).`;
  return null;
}

/* ---------- Imágenes (Jesse, 11-11-2026: SOLO imágenes; otros archivos, en /hardware) ---------- */

/** Tipos de imagen que se aceptan (se comprueba también el contenido en el servidor) */
export const TIPOS_IMAGEN_MENSAJE = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Lo más que puede pesar la foto ANTES de reducirla (las del móvil rondan 3-8 MB) */
export const MAX_MB_IMAGEN = 15;
export const MAX_BYTES_IMAGEN = MAX_MB_IMAGEN * 1024 * 1024;

/** Lado más largo de la imagen guardada (se reduce y se pasa a WebP: pesa mucho menos) */
export const LADO_IMAGEN_MENSAJE = 1600;

/** Por qué no vale una imagen elegida en el navegador, o null si vale */
export function problemaImagen(archivo: { type: string; size: number }): string | null {
  if (!TIPOS_IMAGEN_MENSAJE.includes(archivo.type))
    return "Solo se pueden enviar imágenes JPG, PNG, WebP o GIF.";
  if (archivo.size > MAX_BYTES_IMAGEN)
    return `La imagen pesa demasiado (máximo ${MAX_MB_IMAGEN} MB).`;
  return null;
}

/**
 * Lo que sale de un mensaje en la lista de chats o en un correo: el texto, «📷 Foto» o
 * «🎤 Nota de voz (0:12)» (con `segundosAudio` si es un audio)
 */
export function resumenMensaje(
  texto: string,
  conImagen: boolean,
  segundosAudio: number | null = null,
  esSticker = false,
): string {
  if (segundosAudio !== null) return `🎤 Nota de voz (${duracionAudio(segundosAudio)})`;
  if (esSticker) return "💟 Sticker";
  if (!conImagen) return texto;
  return texto ? `📷 ${texto}` : "📷 Foto";
}

/* ---------- Notas de voz (Jesse, 13-11-2026) ---------- */

/** Lo más largo que puede durar una nota de voz (al llegar, la grabación se para sola) */
export const MAX_SEGUNDOS_AUDIO = 5 * 60;
/** Lo más que puede pesar (5 min de voz rondan 2-3 MB; esto deja margen) */
export const MAX_MB_AUDIO = 8;
export const MAX_BYTES_AUDIO = MAX_MB_AUDIO * 1024 * 1024;
/** Menos de esto es un toque sin querer: no se envía */
export const MIN_SEGUNDOS_AUDIO = 1;

/**
 * Formatos que graba el navegador, del que mejor se oye en todos los aparatos al que menos:
 * MP4/AAC lo reproducen todos (también iPhone); WebM y Ogg con Opus, Chrome, Firefox y Android.
 * Safari graba en MP4; Chrome y Edge recientes, también; Firefox, en Ogg o WebM.
 */
export const FORMATOS_GRABACION = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/webm",
] as const;

/** Tipos de audio que se aceptan (sin los «;codecs=…»). Se comprueba también el contenido */
export const TIPOS_AUDIO_MENSAJE = ["audio/mp4", "audio/webm", "audio/ogg"] as const;
export type TipoAudio = (typeof TIPOS_AUDIO_MENSAJE)[number];

/** El primer formato de la lista que sabe grabar este navegador ("" = el que él quiera) */
export function formatoGrabacion(admite: (tipo: string) => boolean): string {
  return FORMATOS_GRABACION.find((tipo) => admite(tipo)) ?? "";
}

/** «audio/webm;codecs=opus» → «audio/webm»; null si no es un audio que aceptemos */
export function tipoAudioBase(tipo: string): TipoAudio | null {
  const base = tipo.split(";")[0].trim().toLowerCase();
  // Algunos navegadores dicen video/webm o video/mp4 aunque solo haya sonido
  const comoAudio = base.replace(/^video\//, "audio/");
  return (TIPOS_AUDIO_MENSAJE as readonly string[]).includes(comoAudio)
    ? (comoAudio as TipoAudio)
    : null;
}

/**
 * Qué audio es por su contenido (los primeros bytes), no por lo que diga el navegador:
 * WebM empieza por 1A 45 DF A3, Ogg por «OggS» y MP4 lleva «ftyp» en el byte 4
 */
export function tipoAudioDeContenido(bytes: Uint8Array): TipoAudio | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3)
    return "audio/webm";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "OggS") return "audio/ogg";
  if (String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") return "audio/mp4";
  return null;
}

/** La extensión con la que se guarda cada tipo */
export function extensionAudio(tipo: TipoAudio): string {
  return tipo === "audio/mp4" ? "m4a" : tipo === "audio/ogg" ? "ogg" : "webm";
}

/**
 * Los segundos que manda el navegador, comprobados (redondeados; null si no valen). El navegador
 * los mide mientras graba: los archivos WebM de Chrome no traen la duración dentro.
 */
export function leerSegundosAudio(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : Number(String(valor ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < MIN_SEGUNDOS_AUDIO || n > MAX_SEGUNDOS_AUDIO + 2) return null;
  return Math.min(MAX_SEGUNDOS_AUDIO, Math.max(MIN_SEGUNDOS_AUDIO, Math.round(n)));
}

/** Por qué no vale una nota de voz, o null si vale */
export function problemaAudio(archivo: { type: string; size: number }, segundos: number | null) {
  if (!tipoAudioBase(archivo.type)) return "Ese formato de audio no se puede enviar.";
  if (archivo.size === 0) return "La grabación ha salido vacía. Vuelve a probar.";
  if (archivo.size > MAX_BYTES_AUDIO)
    return `La nota de voz pesa demasiado (máximo ${MAX_MB_AUDIO} MB).`;
  if (segundos === null) return "La nota de voz es demasiado corta o demasiado larga.";
  return null;
}

/** 75 → «1:15»; 5 → «0:05» */
export function duracionAudio(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Tamaño con el que se reserva el hueco de una imagen en el chat (para que no salte al cargar) */
export function tamanoEnChat(
  ancho: number | null,
  alto: number | null,
  maximo = 320,
): { ancho: number; alto: number } {
  if (!ancho || !alto) return { ancho: maximo, alto: Math.round(maximo * 0.75) };
  const escala = Math.min(1, maximo / Math.max(ancho, alto));
  return {
    ancho: Math.max(1, Math.round(ancho * escala)),
    alto: Math.max(1, Math.round(alto * escala)),
  };
}

/* ---------- Emojis (la lista completa está en src/config/emojis.ts) ---------- */

/** Quita tildes y pasa a minúsculas: «Corazón» y «corazon» buscan lo mismo */
export const textoBusqueda = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * Busca emojis por sus palabras en español («corazon», «robot», «fiesta»…). Primero los que
 * tienen una palabra que EMPIEZA por lo buscado; después los que solo la contienen.
 */
export function buscarEmojis(
  categorias: { emojis: [string, string][] }[],
  texto: string,
  maximo = 160,
): string[] {
  const buscado = textoBusqueda(texto);
  if (!buscado) return [];
  const empiezan: string[] = [];
  const contienen: string[] = [];
  for (const { emojis } of categorias) {
    for (const [emoji, palabras] of emojis) {
      if (palabras.startsWith(buscado) || palabras.includes(` ${buscado}`)) empiezan.push(emoji);
      else if (palabras.includes(buscado)) contienen.push(emoji);
    }
  }
  return [...new Set([...empiezan, ...contienen])].slice(0, maximo);
}

/**
 * Trozos de un mensaje para enseñar los enlaces como enlaces (sin HTML: React escapa el resto).
 * Solo http(s), para que nadie pueda colar un "javascript:".
 */
export function trozosConEnlaces(texto: string): { texto: string; enlace?: string }[] {
  const trozos: { texto: string; enlace?: string }[] = [];
  let ultimo = 0;
  for (const encontrado of texto.matchAll(/https?:\/\/[^\s<>"]+/g)) {
    // Un punto o paréntesis final suele ser de la frase, no del enlace
    const url = encontrado[0].replace(/[.,;:!?)\]]+$/, "");
    const inicio = encontrado.index;
    if (inicio > ultimo) trozos.push({ texto: texto.slice(ultimo, inicio) });
    trozos.push({ texto: url, enlace: url });
    ultimo = inicio + url.length;
  }
  if (ultimo < texto.length) trozos.push({ texto: texto.slice(ultimo) });
  return trozos;
}

const zona = "Europe/Madrid";
const hora = new Intl.DateTimeFormat("es-ES", { timeStyle: "short", timeZone: zona });
const diaLargo = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: zona,
});
const diaConAno = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: zona });
const diaClave = new Intl.DateTimeFormat("en-CA", { timeZone: zona });

/** Hora de un mensaje, como en WhatsApp: «10:32» */
export const horaMensaje = (fecha: Date) => hora.format(fecha);

/** Clave del día (en hora de España) para separar los mensajes por días */
export const claveDia = (fecha: Date) => diaClave.format(fecha);

/** El separador de días del chat: «Hoy», «Ayer», «lunes, 3 de noviembre» o con año si es de otro */
export function textoDia(fecha: Date, ahora = new Date()): string {
  const clave = claveDia(fecha);
  if (clave === claveDia(ahora)) return "Hoy";
  if (clave === claveDia(new Date(ahora.getTime() - 86_400_000))) return "Ayer";
  if (clave.slice(0, 4) !== claveDia(ahora).slice(0, 4)) return diaConAno.format(fecha);
  const texto = diaLargo.format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Lo que sale en la lista de chats junto al último mensaje: hora si es de hoy, si no el día */
export function cuandoEnLista(fecha: Date, ahora = new Date()): string {
  const dia = textoDia(fecha, ahora);
  return dia === "Hoy" ? horaMensaje(fecha) : dia;
}

/* ---------- Tareas (como en Notion) ---------- */

export type Prioridad = "ALTA" | "MEDIA" | "BAJA";
export type Estado = "PENDIENTE" | "EN_CURSO" | "HECHA";

/** Las prioridades con su color de semáforo (clases de Tailwind de la etiqueta y del punto) */
export const PRIORIDADES: { valor: Prioridad; nombre: string; etiqueta: string; punto: string }[] =
  [
    { valor: "ALTA", nombre: "Alta", etiqueta: "bg-error/10 text-error-oscuro", punto: "bg-error" },
    {
      valor: "MEDIA",
      nombre: "Media",
      etiqueta: "bg-aviso/10 text-aviso-oscuro",
      punto: "bg-[#E8B100]",
    },
    { valor: "BAJA", nombre: "Baja", etiqueta: "bg-exito/10 text-exito", punto: "bg-exito" },
  ];

export const ESTADOS: { valor: Estado; nombre: string; etiqueta: string }[] = [
  { valor: "PENDIENTE", nombre: "Por hacer", etiqueta: "bg-tinta/5 text-tinta/80" },
  { valor: "EN_CURSO", nombre: "En curso", etiqueta: "bg-acento/10 text-acento" },
  { valor: "HECHA", nombre: "Hecha", etiqueta: "bg-exito/10 text-exito" },
];

export const datosPrioridad = (p: Prioridad | null | undefined) =>
  PRIORIDADES.find((x) => x.valor === p) ?? null;
export const datosEstado = (e: Estado) => ESTADOS.find((x) => x.valor === e) ?? ESTADOS[0];

/** Orden para las listas de tareas: primero la prioridad alta */
export const ordenPrioridad = (p: Prioridad | null | undefined) =>
  p === "ALTA" ? 0 : p === "MEDIA" ? 1 : p === "BAJA" ? 2 : 3;

/** Las opciones del recordatorio. Los «antes» solo valen si la tarea tiene fecha de entrega */
export const RECORDATORIOS = [
  { valor: "", nombre: "Sin recordatorio" },
  { valor: "entrega", nombre: "A la hora de entrega", minutosAntes: 0 },
  { valor: "15m", nombre: "15 minutos antes", minutosAntes: 15 },
  { valor: "1h", nombre: "1 hora antes", minutosAntes: 60 },
  { valor: "4h", nombre: "4 horas antes", minutosAntes: 4 * 60 },
  { valor: "10h", nombre: "10 horas antes", minutosAntes: 10 * 60 },
  { valor: "1d", nombre: "1 día antes", minutosAntes: 24 * 60 },
  { valor: "otra", nombre: "Otro día y hora…" },
] as const;

export type OpcionRecordatorio = (typeof RECORDATORIOS)[number]["valor"];

/** Al posponer una alarma, vuelve a sonar dentro de estos minutos */
export const MINUTOS_POSPONER = [10, 60] as const;

/**
 * Cuándo debe sonar el recordatorio según lo elegido. Devuelve null si no hay, o un texto con el
 * problema si falta algo («15 minutos antes» sin fecha de entrega…).
 */
export function calcularRecordatorio(
  opcion: string,
  entrega: Date | null,
  otra: Date | null,
): Date | null | string {
  if (!opcion) return null;
  if (opcion === "otra") return otra ?? "Elige el día y la hora del recordatorio.";
  const elegida = RECORDATORIOS.find((r) => r.valor === opcion);
  if (!elegida || !("minutosAntes" in elegida)) return "Ese recordatorio no existe.";
  if (!entrega) return "Para avisar antes de la entrega, pon primero la fecha de entrega.";
  return new Date(entrega.getTime() - elegida.minutosAntes * 60_000);
}

/** Lo que llega del navegador al crear una tarea, ya comprobado */
export interface DatosTarea {
  prioridad: Prioridad | null;
  entregaEn: Date | null;
  responsableId: string | null;
  recordarEn: Date | null;
}

/** Fecha que llega del navegador en ISO (la convierte él desde su hora local). null si no vale */
export function fechaDeTexto(valor: unknown): Date | null {
  if (typeof valor !== "string" || !valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  // Entre el año 2000 y dentro de 10 años: así nadie guarda una fecha absurda
  const ano = fecha.getUTCFullYear();
  return ano >= 2000 && ano <= new Date().getUTCFullYear() + 10 ? fecha : null;
}

/** Comprueba los datos de una tarea que llegan del navegador */
export function leerDatosTarea(entrada: {
  prioridad?: unknown;
  entrega?: unknown;
  responsableId?: unknown;
  recordatorio?: unknown;
  recordatorioOtro?: unknown;
}): DatosTarea | string {
  const prioridad = PRIORIDADES.some((p) => p.valor === entrada.prioridad)
    ? (entrada.prioridad as Prioridad)
    : null;
  const entregaEn = fechaDeTexto(entrada.entrega);
  if (entrada.entrega && !entregaEn) return "La fecha de entrega no es válida.";
  const responsableId =
    typeof entrada.responsableId === "string" && /^[0-9a-f]{24}$/.test(entrada.responsableId)
      ? entrada.responsableId
      : null;
  const recordarEn = calcularRecordatorio(
    typeof entrada.recordatorio === "string" ? entrada.recordatorio : "",
    entregaEn,
    fechaDeTexto(entrada.recordatorioOtro),
  );
  if (typeof recordarEn === "string") return recordarEn;
  return { prioridad, entregaEn, responsableId, recordarEn };
}

const fechaCorta = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: zona,
});

/** «lun, 10 nov, 18:00» (en hora de España) */
export const textoFechaTarea = (fecha: Date) => fechaCorta.format(fecha);

/** ¿Se ha pasado la entrega sin hacerla? */
export const vencida = (entrega: Date | null, estado: Estado, ahora = new Date()) =>
  !!entrega && estado !== "HECHA" && entrega.getTime() < ahora.getTime();
