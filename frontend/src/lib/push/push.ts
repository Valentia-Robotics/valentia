/**
 * AVISOS PUSH (Web Push): manda una notificación al móvil u ordenador de alguien del equipo,
 * aunque tenga la web cerrada (como WhatsApp). Reglas y textos en src/config/push.ts; lo que hace
 * el navegador al recibirla, en public/sw.js.
 *
 * Claves VAPID (las que firman los avisos): si existen VAPID_CLAVE_PUBLICA y VAPID_CLAVE_PRIVADA
 * en las variables, se usan esas. Si no, se crean solas la primera vez y se guardan en la BD
 * (fila «push» de AjustesPush). Así no hace falta tocar nada en Render.
 * OJO: si se cambian las claves, todos tienen que volver a pulsar «Activar avisos».
 */
import "server-only";
import webpush from "web-push";
import type { AvisoPush } from "@/config/push";
import { db } from "@/lib/db";

interface Claves {
  publica: string;
  privada: string;
}

let enMemoria: Promise<Claves> | null = null;

async function leerOCrearClaves(): Promise<Claves> {
  const publica = process.env.VAPID_CLAVE_PUBLICA?.trim();
  const privada = process.env.VAPID_CLAVE_PRIVADA?.trim();
  if (publica && privada) return { publica, privada };
  const guardadas = await db.ajustesPush.findUnique({ where: { id: "push" } });
  if (guardadas) return { publica: guardadas.clavePublica, privada: guardadas.clavePrivada };
  const nuevas = webpush.generateVAPIDKeys();
  try {
    await db.ajustesPush.create({
      data: { id: "push", clavePublica: nuevas.publicKey, clavePrivada: nuevas.privateKey },
    });
    return { publica: nuevas.publicKey, privada: nuevas.privateKey };
  } catch {
    // Otra petición las creó a la vez: se usan las suyas
    const otra = await db.ajustesPush.findUniqueOrThrow({ where: { id: "push" } });
    return { publica: otra.clavePublica, privada: otra.clavePrivada };
  }
}

function claves(): Promise<Claves> {
  enMemoria ??= leerOCrearClaves().catch((error) => {
    enMemoria = null; // que se vuelva a intentar la próxima vez
    throw error;
  });
  return enMemoria;
}

/** La clave pública: la necesita el navegador para suscribirse */
export async function clavePublicaPush(): Promise<string> {
  return (await claves()).publica;
}

/** Quién manda los avisos (lo piden Google y Apple): una dirección https o un mailto */
function contacto(): string {
  const propio = process.env.VAPID_CONTACTO?.trim();
  if (propio && /^(mailto:|https:\/\/)/.test(propio)) return propio;
  const web = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return /^https:\/\//.test(web) && !/localhost/.test(web)
    ? web
    : "mailto:hola@valentiarobotics.com";
}

/** Guarda (o pone al día) el aparato de alguien que ha aceptado los avisos */
export async function guardarSuscripcion(
  usuarioId: string,
  datos: { endpoint: string; p256dh: string; auth: string },
  aparato: string,
) {
  await db.suscripcionPush.upsert({
    where: { endpoint: datos.endpoint },
    create: { usuarioId, ...datos, aparato },
    update: { usuarioId, p256dh: datos.p256dh, auth: datos.auth, aparato, usadaEn: new Date() },
  });
}

/** Quita un aparato (al pulsar «Desactivar»). Solo el suyo: nadie borra los de otro */
export async function quitarSuscripcion(usuarioId: string, endpoint: string) {
  await db.suscripcionPush.deleteMany({ where: { usuarioId, endpoint } });
}

/** Cuántos aparatos con avisos tiene alguien */
export async function aparatosConAvisos(usuarioId: string) {
  return db.suscripcionPush.findMany({
    where: { usuarioId },
    select: { endpoint: true, aparato: true, creadaEn: true },
    orderBy: { creadaEn: "desc" },
  });
}

/**
 * Manda el aviso a todos los aparatos de esas personas. Nunca lanza error: si falla, se apunta en
 * el registro y sigue (el mensaje ya está guardado; el aviso es un extra). Los aparatos que ya no
 * valen (el servicio responde 404 o 410) se borran.
 * `aviso` puede ser una función para dar a cada persona su texto (p. ej. su número sin leer).
 */
export async function avisarPorPush(
  usuarioIds: string[],
  aviso: AvisoPush | ((usuarioId: string) => Promise<AvisoPush> | AvisoPush),
) {
  if (usuarioIds.length === 0) return;
  try {
    const suscripciones = await db.suscripcionPush.findMany({
      where: { usuarioId: { in: [...new Set(usuarioIds)] } },
    });
    if (suscripciones.length === 0) return;
    const { publica, privada } = await claves();
    const detalles = {
      vapidDetails: { subject: contacto(), publicKey: publica, privateKey: privada },
    };
    const porPersona = new Map<string, string>();
    for (const id of new Set(suscripciones.map((s) => s.usuarioId))) {
      porPersona.set(id, JSON.stringify(typeof aviso === "function" ? await aviso(id) : aviso));
    }
    await Promise.all(
      suscripciones.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            porPersona.get(s.usuarioId)!,
            // Urgente: que el móvil lo entregue enseguida aunque esté ahorrando batería. 1 día de vida
            { ...detalles, TTL: 86_400, urgency: "high", topic: undefined },
          );
        } catch (error) {
          const codigo = (error as { statusCode?: number }).statusCode;
          if (codigo === 404 || codigo === 410) {
            await db.suscripcionPush.deleteMany({ where: { id: s.id } });
          } else {
            console.error(
              `[push] No se ha podido avisar a un aparato (${codigo ?? "sin respuesta"}).`,
            );
          }
        }
      }),
    );
  } catch (error) {
    console.error("[push] No se han podido mandar los avisos.", error);
  }
}
