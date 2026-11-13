/**
 * VIDEOLLAMADAS DEL EQUIPO (reglas puras, sin BD). Jesse, 13-11-2026: «videollamada en el General,
 * en Hardware, en Edición y en los chats privados».
 *
 * El vídeo no pasa por nuestro servidor: cada llamada es una sala de Jitsi (programa libre de
 * videollamadas). Nosotros solo apuntamos quién la empieza y quién está dentro, para avisar a los
 * demás («📹 Jesse te llama») y enseñar «Videollamada en curso · Unirme» en el chat.
 *
 * Dos maneras, según las variables de Render:
 *   - «incrustada»: con las claves de JaaS (Jitsi as a Service, de 8x8; gratis hasta 25 personas
 *     distintas al mes) la llamada se abre DENTRO de la web, sin cuentas ni inicio de sesión.
 *     Variables: JAAS_APP_ID, JAAS_KID y JAAS_CLAVE_PRIVADA (ver DESPLIEGUE.md).
 *   - «pestana»: sin claves, se abre meet.jit.si (gratis) en otra pestaña. Ahí la primera persona
 *     que entra tiene que iniciar sesión con Google, GitHub o Facebook (lo pide meet.jit.si).
 */

/** Cada cuánto avisa la pantalla de la llamada de que sigues dentro */
export const SEGUNDOS_LATIDO = 25;

/**
 * Cuánto tiempo sin latido se sigue contando a alguien como dentro. Largo a propósito: con la
 * llamada en otra pestaña, el navegador frena la nuestra (un latido por minuto como mucho).
 */
export const SEGUNDOS_PRESENTE = 150;

/** Durante cuánto suena el aviso «te llama» a los demás después de empezar la llamada */
export const MINUTOS_SONAR = 2;

/** Una llamada como mucho dura esto (por si alguien se deja la pestaña abierta días) */
export const HORAS_MAXIMO_LLAMADA = 8;

export interface PresenteLlamada {
  usuarioId: string;
  nombre: string;
  vistoEn: Date;
}

export interface DatosLlamada {
  iniciadaPorId: string;
  empezadaEn: Date;
  terminadaEn: Date | null;
  presentes: PresenteLlamada[];
}

/** Los que siguen dentro (han mandado un latido hace poco) */
export function presentesActivos(presentes: PresenteLlamada[], ahora = new Date()) {
  const limite = ahora.getTime() - SEGUNDOS_PRESENTE * 1000;
  return presentes.filter((p) => p.vistoEn.getTime() >= limite);
}

/**
 * ¿Sigue la llamada? Sí si no se ha terminado, no es demasiado vieja y queda alguien dentro. Recién
 * empezada cuenta como viva aunque aún no haya latidos (quien la empieza entra enseguida).
 */
export function llamadaActiva(llamada: DatosLlamada, ahora = new Date()): boolean {
  if (llamada.terminadaEn) return false;
  const edad = ahora.getTime() - llamada.empezadaEn.getTime();
  if (edad > HORAS_MAXIMO_LLAMADA * 3_600_000) return false;
  if (edad < SEGUNDOS_PRESENTE * 1000) return true;
  return presentesActivos(llamada.presentes, ahora).length > 0;
}

/** ¿Le tiene que sonar «te llama» a esta persona? Solo al principio, y nunca a quien ya está dentro */
export function debeSonar(llamada: DatosLlamada, miId: string, ahora = new Date()): boolean {
  if (!llamadaActiva(llamada, ahora) || llamada.iniciadaPorId === miId) return false;
  if (ahora.getTime() - llamada.empezadaEn.getTime() > MINUTOS_SONAR * 60_000) return false;
  return !presentesActivos(llamada.presentes, ahora).some((p) => p.usuarioId === miId);
}

/** Apunta (o pone al día) a alguien dentro de la llamada; quita a los que ya se fueron */
export function conPresente(
  presentes: PresenteLlamada[],
  persona: { usuarioId: string; nombre: string },
  ahora = new Date(),
): PresenteLlamada[] {
  return [
    ...presentesActivos(presentes, ahora).filter((p) => p.usuarioId !== persona.usuarioId),
    { ...persona, vistoEn: ahora },
  ];
}

/** Quita a alguien de la llamada (al colgar) */
export function sinPresente(presentes: PresenteLlamada[], usuarioId: string, ahora = new Date()) {
  return presentesActivos(presentes, ahora).filter((p) => p.usuarioId !== usuarioId);
}

/** El nombre de una sala: «valentia» + 24 letras al azar (solo minúsculas y números, como pide Jitsi) */
export function nombreSala(azar: string): string {
  const limpio = azar.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (limpio.length < 16) throw new Error("Hace falta más azar para el nombre de la sala.");
  return `valentia${limpio.slice(0, 24)}`;
}

export const esNombreSala = (sala: string) => /^valentia[a-z0-9]{16,24}$/.test(sala);

/* ---------- Dónde se hace la llamada ---------- */

export type ServicioVideo =
  | { modo: "incrustada"; dominio: string; appId: string; kid: string; clavePrivada: string }
  | { modo: "pestana"; dominio: string };

/** Dominio de JaaS (8x8) y de la versión gratis de Jitsi */
export const DOMINIO_JAAS = "8x8.vc";
export const DOMINIO_JITSI_GRATIS = "meet.jit.si";

/**
 * Qué servicio usar según las variables. La clave privada puede venir con «\n» escritos (Render
 * guarda mejor una sola línea): se convierten en saltos de línea de verdad.
 */
export function servicioVideo(entorno: Record<string, string | undefined>): ServicioVideo {
  const appId = entorno.JAAS_APP_ID?.trim() ?? "";
  const kid = entorno.JAAS_KID?.trim() ?? "";
  const clavePrivada = (entorno.JAAS_CLAVE_PRIVADA ?? "").replace(/\\n/g, "\n").trim();
  if (
    /^vpaas-magic-cookie-[a-f0-9]+$/.test(appId) &&
    kid.startsWith(`${appId}/`) &&
    clavePrivada.includes("PRIVATE KEY")
  ) {
    return { modo: "incrustada", dominio: DOMINIO_JAAS, appId, kid, clavePrivada };
  }
  const propio = entorno.JITSI_DOMINIO?.trim();
  return {
    modo: "pestana",
    dominio: propio && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(propio) ? propio : DOMINIO_JITSI_GRATIS,
  };
}

/** Lo que va en el JWT de JaaS (lo firma el servidor con la clave privada): quién eres y a qué sala */
export function datosJwtJaas(datos: {
  appId: string;
  sala: string;
  usuario: { id: string; nombre: string; email?: string };
  ahora?: Date;
}) {
  const ahora = Math.floor((datos.ahora ?? new Date()).getTime() / 1000);
  return {
    aud: "jitsi",
    iss: "chat",
    sub: datos.appId,
    room: datos.sala,
    iat: ahora,
    nbf: ahora - 10,
    // Para entrar: la llamada puede seguir más rato una vez dentro
    exp: ahora + 3 * 3600,
    context: {
      user: {
        id: datos.usuario.id,
        name: datos.usuario.nombre,
        email: datos.usuario.email ?? "",
        avatar: "",
        // Todos los del equipo pueden silenciar o echar a alguien (son compañeros)
        moderator: "true",
        "hidden-from-recorder": "false",
      },
      features: {
        livestreaming: "false",
        recording: "false",
        transcription: "false",
        "outbound-call": "false",
        "sip-outbound-call": "false",
      },
    },
  };
}

/**
 * Ajustes de Jitsi que van detrás de «#» en la dirección: en español, sin la pantalla previa
 * (entras directo, como en WhatsApp) y sin que el móvil te mande a instalar su app.
 */
export function ajustesSala(nombre: string): string {
  const ajustes: Record<string, unknown> = {
    "config.defaultLanguage": "es",
    "config.prejoinConfig.enabled": false,
    "config.disableDeepLinking": true,
    "config.startWithAudioMuted": false,
    "config.startWithVideoMuted": false,
    "userInfo.displayName": nombre,
  };
  return Object.entries(ajustes)
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(JSON.stringify(valor))}`)
    .join("&");
}

/** La dirección de la sala (con el JWT si es JaaS) */
export function direccionSala(
  servicio: ServicioVideo,
  sala: string,
  nombre: string,
  jwt?: string,
): string {
  if (!esNombreSala(sala)) throw new Error("Nombre de sala no válido.");
  const ajustes = ajustesSala(nombre);
  if (servicio.modo === "incrustada") {
    return `https://${servicio.dominio}/${servicio.appId}/${sala}?jwt=${encodeURIComponent(jwt ?? "")}#${ajustes}`;
  }
  return `https://${servicio.dominio}/${sala}#${ajustes}`;
}

/** «Jesse», «Jesse y Dani», «Jesse, Dani y 2 más» */
export function textoPresentes(nombres: string[]): string {
  if (nombres.length === 0) return "Nadie todavía";
  if (nombres.length === 1) return nombres[0];
  if (nombres.length === 2) return `${nombres[0]} y ${nombres[1]}`;
  if (nombres.length === 3) return `${nombres[0]}, ${nombres[1]} y ${nombres[2]}`;
  return `${nombres[0]}, ${nombres[1]} y ${nombres.length - 2} más`;
}
