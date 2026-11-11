/**
 * MENSAJES DEL EQUIPO (/mensajes): reglas puras, sin base de datos.
 * Funciona como un WhatsApp del equipo: un chat «General» para todos los trabajadores
 * (administración, editores y hardware) y un chat privado entre cada dos personas.
 * Los clientes no lo ven nunca.
 *
 * Cada chat es un «canal» guardado como texto:
 *   - "general"                       → el chat de todos
 *   - "privado:<id menor>_<id mayor>" → el chat de dos personas (siempre el mismo, lo abra quien lo abra)
 */

export const CANAL_GENERAL = "general";

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
export const SEGUNDOS_REFRESCO_CONTADOR = 45;

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
 * La dirección de cada chat: /mensajes/general o /mensajes/<id de la otra persona>.
 * Devuelve el canal que corresponde a quien lo abre, o null si la dirección no vale.
 */
export function canalDeRuta(ruta: string, miId: string): string | null {
  if (ruta === CANAL_GENERAL) return CANAL_GENERAL;
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

/** Por qué no se puede enviar un mensaje, o null si está bien. Con imagen, el texto puede ir vacío */
export function problemaMensaje(texto: string, conImagen = false): string | null {
  if (!texto && !conImagen) return "Escribe algo antes de enviar.";
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

/** Lo que sale de un mensaje en la lista de chats o en un correo: el texto, o «📷 Foto» */
export function resumenMensaje(texto: string, conImagen: boolean): string {
  if (!conImagen) return texto;
  return texto ? `📷 ${texto}` : "📷 Foto";
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

/* ---------- Emojis (sin librerías: los que dibuja el propio móvil u ordenador) ---------- */

export const GRUPOS_EMOJI: { nombre: string; icono: string; emojis: string[] }[] = [
  {
    nombre: "Caras",
    icono: "😀",
    emojis: [
      ..."😀😃😄😁😆😅🤣😂🙂😉😊😇🥰😍🤩😘😋😜🤪🤗🤭🤫🤔🫡🤐😐😑😶🙄😏😬😌😔😴😷🤒🤯🥳😎🤓🧐😕😟😮😲😳🥺😢😭😱😤😡🤬💀🤡👻👽🤖",
    ],
  },
  {
    nombre: "Gestos",
    icono: "👍",
    emojis: [..."👍👎👌🤌✌🤞🤟🤘🤙👈👉👆👇☝✋🤚🖐👋👏🙌🫶👐🤲🤝🙏💪🦾✍👀🧠"],
  },
  {
    nombre: "Corazones",
    icono: "❤️",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "💔",
      "❣️",
      "💕",
      "💞",
      "💖",
      "💯",
      "💥",
      "💫",
      "⭐",
      "🌟",
      "✨",
      "🔥",
      "🎉",
      "🎊",
      "🏆",
      "🥇",
      "🎯",
    ],
  },
  {
    nombre: "Trabajo",
    icono: "🛠️",
    emojis: [
      "✅",
      "☑️",
      "✔️",
      "❌",
      "⚠️",
      "❗",
      "❓",
      "⏰",
      "⏳",
      "📅",
      "📌",
      "📎",
      "📝",
      "📋",
      "📦",
      "🚚",
      "💶",
      "💡",
      "🔋",
      "🔌",
      "⚙️",
      "🛠️",
      "🔧",
      "🔩",
      "🧲",
      "🪛",
      "💻",
      "🖥️",
      "⌨️",
      "🖨️",
      "📱",
      "📷",
      "🎥",
      "📣",
      "📈",
      "📉",
      "🚀",
      "🤖",
      "🦾",
      "🚗",
    ],
  },
  {
    nombre: "Comida y más",
    icono: "☕",
    emojis: [
      "☕",
      "🍕",
      "🍔",
      "🍟",
      "🌮",
      "🍩",
      "🍪",
      "🎂",
      "🍺",
      "🥤",
      "🍎",
      "🌞",
      "🌙",
      "🌧️",
      "❄️",
      "🌈",
      "🐶",
      "🐱",
      "🦊",
      "🐢",
      "🌱",
      "🌍",
      "⚽",
      "🎮",
      "🎧",
      "🎁",
      "🙈",
    ],
  },
];

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
