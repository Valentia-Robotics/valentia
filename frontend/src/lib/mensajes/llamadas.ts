/**
 * VIDEOLLAMADAS DEL EQUIPO (base de datos y permisos). Las reglas puras están en src/config/llamadas.ts.
 *
 * Mismos permisos que el chat (comprobarCanal): en un grupo solo sus miembros, en un privado solo
 * sus dos personas. Una sola llamada viva por chat: si ya hay una, «Llamar» te mete en ella.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { after } from "next/server";
import {
  DOMINIO_JAAS,
  conPresente,
  datosJwtJaas,
  debeSonar,
  direccionSala,
  llamadaActiva,
  nombreSala,
  presentesActivos,
  servicioVideo,
  sinPresente,
  type DatosLlamada,
} from "@/config/llamadas";
import { canalDeRuta, grupoDe } from "@/config/mensajes";
import { avisoDeLlamada } from "@/config/push";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { registrarIntento } from "@/lib/limite";
import { avisarPorPush } from "@/lib/push/push";
import type { UsuarioActual } from "@/lib/sesion";
import { firmarJwt } from "./jwtVideo";
import { ErrorMensaje, comprobarCanal, filtroMisCanales, rutaDeCanal } from "./mensajes";

/** La llamada como la ve la pantalla del chat */
export interface LlamadaEnCurso {
  id: string;
  de: string;
  empezadaEn: Date;
  /** Nombres de los que están dentro ahora */
  dentro: string[];
  yoDentro: boolean;
}

/** Para entrar: a dónde ir y cómo (dentro de la web o en otra pestaña) */
export interface EntradaLlamada {
  id: string;
  modo: "incrustada" | "pestana";
  direccion: string;
}

const servicio = () => servicioVideo(process.env);

/** ¿Funcionan las llamadas dentro de la web? (hay claves de JaaS) */
export const llamadaIncrustada = () => servicio().modo === "incrustada";

/** El origen que hay que permitir en la CSP para el marco de la llamada */
export const ORIGEN_LLAMADA_INCRUSTADA = `https://${DOMINIO_JAAS}`;

type Fila = DatosLlamada & { id: string; canal: string; sala: string; iniciadaPorNombre: string };

/** La llamada viva de un canal, o null. Si la última se quedó sin nadie, se da por terminada */
async function llamadaViva(canal: string): Promise<Fila | null> {
  const fila = await db.llamadaEquipo.findFirst({
    where: { canal, terminadaEn: null },
    orderBy: { empezadaEn: "desc" },
  });
  if (!fila) return null;
  if (llamadaActiva(fila)) return fila;
  await db.llamadaEquipo.update({ where: { id: fila.id }, data: { terminadaEn: new Date() } });
  return null;
}

const resumen = (fila: Fila, yo: UsuarioActual): LlamadaEnCurso => {
  const dentro = presentesActivos(fila.presentes);
  return {
    id: fila.id,
    de: fila.iniciadaPorNombre,
    empezadaEn: fila.empezadaEn,
    dentro: dentro.map((p) => p.nombre),
    yoDentro: dentro.some((p) => p.usuarioId === yo.id),
  };
};

/** El canal de una ruta, comprobando que «yo» puede usarlo. null si no */
async function canalPermitido(yo: UsuarioActual, ruta: string) {
  const canal = canalDeRuta(ruta, yo.id);
  if (!canal) return null;
  try {
    const datos = await comprobarCanal(yo, canal);
    return { canal, ...datos };
  } catch (error) {
    if (error instanceof ErrorMensaje) return null;
    throw error;
  }
}

/** La llamada en curso de un chat (para «Videollamada en curso · Unirme»), o null */
export async function llamadaDelChat(yo: UsuarioActual, ruta: string) {
  const permitido = await canalPermitido(yo, ruta);
  if (!permitido) return null;
  const fila = await llamadaViva(permitido.canal);
  return fila ? resumen(fila, yo) : null;
}

/** Busca una llamada por id y comprueba que «yo» la puede ver */
async function llamadaMia(yo: UsuarioActual, id: string): Promise<Fila> {
  if (!esId(id)) throw new ErrorMensaje("Esa llamada no existe.");
  const fila = await db.llamadaEquipo.findUnique({ where: { id } });
  if (!fila) throw new ErrorMensaje("Esa llamada no existe.");
  await comprobarCanal(yo, fila.canal); // lanza ErrorMensaje si no es un chat mío
  return fila;
}

/** La dirección para que «yo» entre en la sala (con mi pase si es JaaS) */
function entrada(yo: UsuarioActual, fila: Fila): EntradaLlamada {
  const s = servicio();
  const jwt =
    s.modo === "incrustada"
      ? firmarJwt(
          datosJwtJaas({
            appId: s.appId,
            sala: fila.sala,
            usuario: { id: yo.id, nombre: yo.nombre, email: yo.email },
          }),
          s.kid,
          s.clavePrivada,
        )
      : undefined;
  return { id: fila.id, modo: s.modo, direccion: direccionSala(s, fila.sala, yo.nombre, jwt) };
}

/**
 * «Llamar» / «Unirme»: si el chat ya tiene una llamada viva, entras en ella; si no, se empieza una y
 * se avisa a los demás (push al móvil + tarjeta «te llama» en la web).
 */
export async function entrarEnLlamada(yo: UsuarioActual, ruta: string): Promise<EntradaLlamada> {
  const permitido = await canalPermitido(yo, ruta);
  if (!permitido) throw new ErrorMensaje("Ese chat no existe.");
  if (!permitido.puedeEscribir)
    throw new ErrorMensaje("Esta persona ya no está en el equipo: no se le puede llamar.");
  if (!(await registrarIntento("llamadaEquipo", yo.id)))
    throw new ErrorMensaje("Has empezado muchas llamadas seguidas. Espera un poco.");

  const yoPresente = { usuarioId: yo.id, nombre: yo.nombre };
  const viva = await llamadaViva(permitido.canal);
  if (viva) {
    const puesta = await db.llamadaEquipo.update({
      where: { id: viva.id },
      data: { presentes: conPresente(viva.presentes, yoPresente) },
    });
    return entrada(yo, puesta);
  }

  const nueva = await db.llamadaEquipo.create({
    data: {
      canal: permitido.canal,
      sala: nombreSala(randomBytes(12).toString("hex")),
      iniciadaPorId: yo.id,
      iniciadaPorNombre: yo.nombre,
      presentes: conPresente([], yoPresente),
    },
  });
  // Puede que otra persona haya empezado otra a la vez: manda la más antigua y esta se cierra
  const otra = await db.llamadaEquipo.findFirst({
    where: { canal: permitido.canal, terminadaEn: null, id: { not: nueva.id } },
    orderBy: { empezadaEn: "asc" },
  });
  if (otra && llamadaActiva(otra)) {
    await db.llamadaEquipo.update({ where: { id: nueva.id }, data: { terminadaEn: new Date() } });
    const puesta = await db.llamadaEquipo.update({
      where: { id: otra.id },
      data: { presentes: conPresente(otra.presentes, yoPresente) },
    });
    return entrada(yo, puesta);
  }

  const otroId = permitido.otro?.id ?? null;
  after(() => avisarDeLlamada(yo, nueva.id, permitido.canal, otroId));
  return entrada(yo, nueva);
}

/** Push «📹 … te llama» a todos los que ven el chat menos a mí */
async function avisarDeLlamada(
  yo: UsuarioActual,
  id: string,
  canal: string,
  otroId: string | null,
) {
  const destinos = await db.usuario.findMany({
    where: otroId
      ? { id: otroId }
      : { AND: [grupoDe(canal)?.filtro ?? { id: { in: [] } }, { id: { not: yo.id } }] },
    select: { id: true },
  });
  await avisarPorPush(
    destinos.map((d) => d.id),
    avisoDeLlamada({ id, de: yo.nombre, ruta: otroId ? yo.id : canal }),
  );
}

/** «Sigo dentro» (cada SEGUNDOS_LATIDO). Devuelve si la llamada sigue */
export async function latidoLlamada(yo: UsuarioActual, id: string): Promise<boolean> {
  const fila = await llamadaMia(yo, id);
  if (!llamadaActiva(fila)) return false;
  await db.llamadaEquipo.update({
    where: { id },
    data: { presentes: conPresente(fila.presentes, { usuarioId: yo.id, nombre: yo.nombre }) },
  });
  return true;
}

/** «Colgar»: salgo; si no queda nadie dentro, la llamada se termina */
export async function salirDeLlamada(yo: UsuarioActual, id: string) {
  const fila = await llamadaMia(yo, id);
  if (fila.terminadaEn) return;
  const quedan = sinPresente(fila.presentes, yo.id);
  await db.llamadaEquipo.update({
    where: { id },
    data: { presentes: quedan, ...(quedan.length === 0 ? { terminadaEn: new Date() } : {}) },
  });
}

/** Una llamada que me tiene que sonar («📹 Jesse te llama · Unirme / Ahora no») */
export interface LlamadaEntrante {
  id: string;
  ruta: string;
  de: string;
}

/** Las llamadas recién empezadas en mis chats en las que aún no estoy */
export async function llamadasQueMeSuenan(yo: UsuarioActual): Promise<LlamadaEntrante[]> {
  const desde = new Date(Date.now() - 10 * 60_000);
  const filas = await db.llamadaEquipo.findMany({
    where: { AND: [filtroMisCanales(yo), { terminadaEn: null, empezadaEn: { gte: desde } }] },
    orderBy: { empezadaEn: "desc" },
    take: 5,
  });
  return filas
    .filter((f) => debeSonar(f, yo.id))
    .map((f) => ({ id: f.id, ruta: rutaDeCanal(f.canal, yo.id), de: f.iniciadaPorNombre }));
}
